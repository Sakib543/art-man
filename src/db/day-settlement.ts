import { eq } from "drizzle-orm";
import { db } from "@/db";
import { computeDayCode, type DayFigures } from "@/db/day-code";
import { loadSettledDay, type LoadedDay } from "@/db/queries/day-data";
import { daySnapshotHistory, daySnapshots, khataEntries, monthCloses } from "@/db/schema";
import { isMonthlySalaryLabel, summarizeDay, type DayCloseSummary } from "@/lib/accounting";
import { atLeastOwner } from "@/lib/auth/roles";
import type { SessionUser } from "@/lib/auth/session";
import { formatMonth, monthOf, monthStart } from "@/lib/business-date";
import { UserError } from "@/lib/errors";

/**
 * Settling a business day: what its work earned, and the closing record derived
 * from that. Shared, because a day is settled when it is closed and again when
 * something inside an already closed day is cancelled.
 */

/** Anything that can run the whole close: a transaction. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** What each staff member earned, into their khata. Used by a close and by a correction. */
export async function postEarnings(tx: Tx, businessDate: string, loaded: LoadedDay, summary: DayCloseSummary) {
  for (const member of loaded.staff) {
    const earned = summary.earnings[member.id];
    if (earned.commission > 0) {
      await tx.insert(khataEntries).values({
        staffId: member.id,
        businessDate,
        kind: "earning",
        label: `Commission (on work of ${earned.work})`,
        amount: earned.commission,
      });
    }
    if (earned.wage > 0) {
      await tx.insert(khataEntries).values({
        staffId: member.id,
        businessDate,
        kind: "earning",
        label: "Daily wage",
        amount: earned.wage,
      });
    }
  }
}
/** Work out the day from the database plus what the manager entered on the screen. */
export function summarize(
  loaded: LoadedDay,
  openingCash: number,
  attendanceMap: Record<string, boolean>,
  payouts: Record<string, number>,
): DayCloseSummary {
  const known = new Set(loaded.staff.map((member) => member.id));
  if (Object.keys(payouts).some((id) => !known.has(id))) throw new UserError("A payment is for someone who is not on today's list");

  return summarizeDay({
    openingCash,
    bills: loaded.bills,
    entries: loaded.entries,
    staff: loaded.staff.map((member) => ({
      id: member.id,
      pay: member.pay,
      present: attendanceMap[member.id] ?? true,
    })),
    payouts,
  });
}

/** A closed month is frozen. A correction to it is an adjustment in the open month (P3.4). */
export async function requireOpenMonth(businessDate: string): Promise<void> {
  const month = monthOf(businessDate);
  const [closed] = await db.select().from(monthCloses).where(eq(monthCloses.month, monthStart(month))).limit(1);
  if (closed) throw new UserError(`${formatMonth(month)} is closed. A mistake in it is put right with an adjustment, from the Monthly report.`);
}

/** Changing anything in a day that is already closed is the Owner's alone (spec 11). */
export async function requireOwnerOnOpenMonth(user: SessionUser, businessDate: string, what: string): Promise<void> {
  if (!atLeastOwner(user.role)) throw new UserError(`This ${what} belongs to a closed day. Only the Owner can cancel it.`);
  await requireOpenMonth(businessDate);
}

/**
 * Put a closed day's figures right after one of its bills or entries was
 * cancelled. Staff payments are cash already handed over, so they stand; what
 * changes is the commission the work earned and the closing record derived from
 * it. Runs inside the caller's transaction, so the cancellation and the
 * correction are saved together or not at all.
 *
 * The day is settled on its own staff list and pay, as Day close saved them
 * (P7.3, `loadSettledDay`) — never on the rates or the staff of the day the
 * correction is made.
 */
export async function resettleDay(tx: Tx, businessDate: string, actor: string, reason: string): Promise<void> {
  const [snapshot] = await tx.select().from(daySnapshots).where(eq(daySnapshots.businessDate, businessDate)).limit(1);
  if (!snapshot) throw new UserError("This day has no closing record to correct.");

  const loaded = await loadSettledDay(tx, businessDate);
  // The payments made at close are already among the day's cash entries.
  const summary = summarize(loaded, snapshot.openingCash, loaded.present, {});

  const lines = await tx.select().from(khataEntries).where(eq(khataEntries.businessDate, businessDate));
  const reversed = new Set(lines.flatMap((line) => (line.reversesEntryId ? [line.reversesEntryId] : [])));

  for (const line of lines) {
    if (line.kind !== "earning" || reversed.has(line.id)) continue;
    // A month's salaries are dated on its last day, beside that day's own
    // earnings. No bill moves them, and postEarnings would not write them
    // again, so reversing them would take a month's pay out of the khata for
    // good — which a change to a bill in a closed month did until P1.10.
    if (isMonthlySalaryLabel(line.label)) continue;
    await tx.insert(khataEntries).values({
      staffId: line.staffId,
      businessDate,
      kind: "adjustment",
      label: `Corrected: ${reason}`,
      amount: -line.amount,
      reversesEntryId: line.id,
    });
  }
  await postEarnings(tx, businessDate, loaded, summary);

  await tx.insert(daySnapshotHistory).values({
    businessDate: snapshot.businessDate,
    sale: snapshot.sale,
    cash: snapshot.cash,
    online: snapshot.online,
    expenses: snapshot.expenses,
    staffEarned: snapshot.staffEarned,
    staffPaid: snapshot.staffPaid,
    dayProfit: snapshot.dayProfit,
    openingCash: snapshot.openingCash,
    expectedCash: snapshot.expectedCash,
    countedCash: snapshot.countedCash,
    difference: snapshot.difference,
    diffReason: snapshot.diffReason,
    securityCode: snapshot.securityCode,
    closedBy: snapshot.closedBy,
    closedAt: snapshot.createdAt,
    reopenReason: `Corrected: ${reason}`,
    reopenedBy: actor,
  });
  await tx.delete(daySnapshots).where(eq(daySnapshots.businessDate, businessDate));

  const figures: DayFigures = {
    sale: summary.sale,
    cash: summary.cash,
    online: summary.online,
    expenses: summary.expenses,
    staffEarned: summary.staffEarned,
    staffPaid: summary.staffPaid,
    dayProfit: summary.dayProfit,
    openingCash: snapshot.openingCash,
    expectedCash: summary.expectedCash,
    // The drawer was counted once, by hand. Only what was expected of it moves.
    countedCash: snapshot.countedCash,
    difference: snapshot.countedCash - summary.expectedCash,
  };

  await tx.insert(daySnapshots).values({
    businessDate,
    ...figures,
    diffReason: snapshot.diffReason,
    securityCode: await computeDayCode(tx, businessDate, figures, snapshot.diffReason),
    closedBy: snapshot.closedBy,
  });
}
