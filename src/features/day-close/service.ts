import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { getLatestBusinessDay, getOpenBusinessDay } from "@/db/queries/business-day";
import {
  attendance,
  businessDays,
  cashEntries,
  daySnapshotHistory,
  daySnapshots,
  khataEntries,
  monthCloses,
} from "@/db/schema";
import { cashDifference, expectedCashBreakdown, summarizeDay, type DayCloseSummary } from "@/lib/accounting";
import type { SessionUser } from "@/lib/auth/session";
import { formatMonth, monthOf, monthStart, nextDate } from "@/lib/business-date";
import { UserError } from "@/lib/errors";
import { loadDay, type LoadedDay } from "@/db/queries/day-data";
import type { CloseInput, ReviewInput } from "./schemas";
import { computeDayCode, type DayFigures } from "./security";
import type { CloseReview } from "./types";

const actorOf = (user: SessionUser) => user.username || user.name;

async function requireOpenDay() {
  const day = await getOpenBusinessDay();
  if (!day) throw new UserError("There is no open business day to close.");
  return day;
}

/** Work out the day from the database plus what the manager entered on the screen. */
function summarize(
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

/** After the cash is counted: expected cash and the difference. */
export async function reviewClose(input: ReviewInput): Promise<CloseReview> {
  const day = await requireOpenDay();
  const loaded = await loadDay(db, day.businessDate);
  const summary = summarize(loaded, day.openingCash, input.attendance, input.payouts);

  return {
    expected: summary.expectedCash,
    counted: input.counted,
    difference: input.counted - summary.expectedCash,
    breakdown: expectedCashBreakdown(day.openingCash, summary),
    onlineSales: summary.online,
  };
}

/**
 * Close the day in one transaction: attendance, staff earnings into the khata,
 * payments made now, the day's snapshot with its security code, then lock.
 * If anything fails, none of it is saved.
 */
export async function closeDay(user: SessionUser, input: CloseInput): Promise<{ securityCode: string }> {
  const day = await requireOpenDay();
  const actor = actorOf(user);
  const payouts = input.payouts;

  return db.transaction(async (tx) => {
    // Claiming the day first stops a second close from running at the same time.
    const claimed = await tx
      .update(businessDays)
      .set({ closedAt: new Date() })
      .where(and(eq(businessDays.businessDate, day.businessDate), isNull(businessDays.closedAt)))
      .returning({ businessDate: businessDays.businessDate });
    if (claimed.length === 0) throw new UserError("This day has already been closed.");

    const loaded = await loadDay(tx, day.businessDate);
    const summary = summarize(loaded, day.openingCash, input.attendance, payouts);

    const { difference, reasonRequired } = cashDifference(input.counted, summary.expectedCash);
    const reason = input.reason?.trim() || null;
    if (reasonRequired && !reason) throw new UserError("Write a reason for the shortage before closing.");

    // 1. Attendance.
    await tx.insert(attendance).values(
      loaded.staff.map((member) => ({
        businessDate: day.businessDate,
        staffId: member.id,
        present: input.attendance[member.id] ?? true,
      })),
    );

    // 2. What each staff member earned today goes into their khata.
    for (const member of loaded.staff) {
      const earned = summary.earnings[member.id];
      if (earned.commission > 0) {
        await tx.insert(khataEntries).values({
          staffId: member.id,
          businessDate: day.businessDate,
          kind: "earning",
          label: `Commission (on work of ${earned.work})`,
          amount: earned.commission,
        });
      }
      if (earned.wage > 0) {
        await tx.insert(khataEntries).values({
          staffId: member.id,
          businessDate: day.businessDate,
          kind: "earning",
          label: "Daily wage",
          amount: earned.wage,
        });
      }
    }

    // 3. Payments handed over now.
    for (const member of loaded.staff) {
      const paid = payouts[member.id] ?? 0;
      if (paid <= 0) continue;
      const [entry] = await tx
        .insert(cashEntries)
        .values({
          businessDate: day.businessDate,
          kind: "staff_payment",
          amount: paid,
          description: `Payment to ${member.name}`,
          staffId: member.id,
          createdBy: actor,
        })
        .returning({ id: cashEntries.id });
      await tx.insert(khataEntries).values({
        staffId: member.id,
        businessDate: day.businessDate,
        kind: "payment",
        label: "Payment",
        amount: -paid,
        cashEntryId: entry.id,
      });
    }

    // 4. The snapshot and its security code. The code covers the day's bills and
    //    entries as they stand now, so a later change to any of them shows up.
    const figures: DayFigures = {
      sale: summary.sale,
      cash: summary.cash,
      online: summary.online,
      expenses: summary.expenses,
      staffEarned: summary.staffEarned,
      staffPaid: summary.staffPaid,
      dayProfit: summary.dayProfit,
      openingCash: day.openingCash,
      expectedCash: summary.expectedCash,
      countedCash: input.counted,
      difference,
    };

    const securityCode = await computeDayCode(tx, day.businessDate, figures);

    await tx.insert(daySnapshots).values({
      businessDate: day.businessDate,
      ...figures,
      diffReason: reason,
      securityCode,
      closedBy: actor,
    });

    await writeAudit(tx, {
      actor,
      action: "day.close",
      target: day.businessDate,
      after: { ...figures, securityCode },
    });

    return { securityCode };
  });
}

/** Open the day after the last closed one. The drawer's leftover carries over automatically. */
export async function startNextDay(user: SessionUser): Promise<void> {
  const latest = await getLatestBusinessDay();
  if (!latest) throw new UserError("No business day has been opened yet.");
  if (!latest.closedAt) throw new UserError("Close today before starting the next business day.");

  const [snapshot] = await db.select().from(daySnapshots).where(eq(daySnapshots.businessDate, latest.businessDate)).limit(1);
  if (!snapshot) throw new UserError("The last day has no closing record.");

  const next = nextDate(latest.businessDate);
  await db.transaction(async (tx) => {
    await tx.insert(businessDays).values({ businessDate: next, openingCash: snapshot.countedCash });
    await writeAudit(tx, {
      actor: actorOf(user),
      action: "day.open",
      target: next,
      after: { openingCash: snapshot.countedCash },
    });
  });
}

/** The Owner opens the very first business day and enters its opening cash. */
export async function openFirstDay(user: SessionUser, businessDate: string, openingCash: number): Promise<void> {
  if (await getLatestBusinessDay()) throw new UserError("A business day already exists.");

  await db.transaction(async (tx) => {
    await tx.insert(businessDays).values({ businessDate, openingCash });
    await writeAudit(tx, { actor: actorOf(user), action: "day.open", target: businessDate, after: { openingCash } });
  });
}

/**
 * The Owner reopens the day that was just closed, so a mistake made at close can
 * be put right. Everything the close wrote is undone the way this system always
 * undoes things: the closing record is archived before it is replaced, and the
 * khata and cash rows are reversed with new rows rather than deleted.
 *
 * Only the latest business day can be reopened, and only before the next day is
 * started. A later day's opening cash is this day's count and its security code
 * is built on this one's, so reopening underneath it would quietly break both.
 */
export async function reopenDay(user: SessionUser, reason: string): Promise<void> {
  const latest = await getLatestBusinessDay();
  if (!latest) throw new UserError("No business day has been opened yet.");
  if (!latest.closedAt) throw new UserError("This day is already open.");

  const month = monthOf(latest.businessDate);
  const [closedMonth] = await db.select().from(monthCloses).where(eq(monthCloses.month, monthStart(month))).limit(1);
  if (closedMonth) throw new UserError(`${formatMonth(month)} is closed. A closed month can only be corrected in the next month.`);

  const date = latest.businessDate;
  const actor = actorOf(user);

  await db.transaction(async (tx) => {
    // Claiming the day first stops two reopens from running at the same time.
    const claimed = await tx
      .update(businessDays)
      .set({ closedAt: null })
      .where(and(eq(businessDays.businessDate, date), isNotNull(businessDays.closedAt)))
      .returning({ businessDate: businessDays.businessDate });
    if (claimed.length === 0) throw new UserError("This day has already been reopened.");

    const [snapshot] = await tx.select().from(daySnapshots).where(eq(daySnapshots.businessDate, date)).limit(1);
    if (!snapshot) throw new UserError("This day has no closing record to undo.");

    // 1. Keep the closing record, with its security code, before replacing it.
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
      reopenReason: reason,
      reopenedBy: actor,
    });

    // 2. Reverse the khata lines the close wrote. Earnings and payments are only
    //    ever written by a close, and a line an earlier reopen already reversed
    //    is left alone so a second reopen cannot subtract it twice.
    const dayLines = await tx.select().from(khataEntries).where(eq(khataEntries.businessDate, date));
    const reversed = new Set(dayLines.flatMap((line) => (line.reversesEntryId ? [line.reversesEntryId] : [])));

    for (const line of dayLines) {
      if (line.kind !== "earning" && line.kind !== "payment") continue;
      if (reversed.has(line.id)) continue;
      await tx.insert(khataEntries).values({
        staffId: line.staffId,
        businessDate: date,
        kind: "adjustment",
        label: `Day reopened: reversal of "${line.label}"`,
        amount: -line.amount,
        reversesEntryId: line.id,
      });
    }

    // 3. Cancel the cash handed to staff at close, exactly as a folder entry is
    //    cancelled: a negative row that points back at the original.
    const dayEntries = await tx.select().from(cashEntries).where(eq(cashEntries.businessDate, date));
    const voided = new Set(dayEntries.flatMap((entry) => (entry.voidsEntryId ? [entry.voidsEntryId] : [])));

    for (const entry of dayEntries) {
      if (entry.kind !== "staff_payment" || entry.voidsEntryId) continue;
      if (voided.has(entry.id)) continue;
      await tx.insert(cashEntries).values({
        businessDate: date,
        kind: "staff_payment",
        amount: -entry.amount,
        description: "Cancelled: day reopened",
        staffId: entry.staffId,
        voidsEntryId: entry.id,
        createdBy: actor,
      });
    }

    // 4. Attendance is marked again at the next close.
    await tx.delete(attendance).where(eq(attendance.businessDate, date));

    // 5. The snapshot itself. Its copy is safe in day_snapshot_history above.
    await tx.delete(daySnapshots).where(eq(daySnapshots.businessDate, date));

    await writeAudit(tx, {
      actor,
      action: "day.reopen",
      target: date,
      before: {
        securityCode: snapshot.securityCode,
        countedCash: snapshot.countedCash,
        expectedCash: snapshot.expectedCash,
        dayProfit: snapshot.dayProfit,
        closedBy: snapshot.closedBy,
      },
      after: { reason },
    });
  });
}
