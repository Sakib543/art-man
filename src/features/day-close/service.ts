import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { getLatestBusinessDay, getOpenBusinessDay } from "@/db/queries/business-day";
import { confirmPin } from "@/db/pin-guard";
import { attendance, businessDays, cashEntries, daySnapshots, khataEntries, staff } from "@/db/schema";
import { cashDifference, expectedCashBreakdown, summarizeDay, type DayCloseSummary } from "@/lib/accounting";
import type { SessionUser } from "@/lib/auth/session";
import { nextDate } from "@/lib/business-date";
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

/** Check each paid staff member's PIN. Nothing is saved: this only catches a wrong PIN early. */
export async function verifyPayouts(
  user: SessionUser,
  payouts: Record<string, { amount: number; pin: string }>,
): Promise<void> {
  for (const [staffId, { amount, pin }] of Object.entries(payouts)) {
    if (amount <= 0) continue;
    const [member] = await db.select().from(staff).where(eq(staff.id, staffId)).limit(1);
    if (!member) throw new UserError("Staff member not found");
    if (!/^\d{4}$/.test(pin)) throw new UserError(`Enter ${member.name}'s 4-digit PIN`);
    await confirmPin({ actor: actorOf(user), subject: `staff:${member.name}`, pin, hash: member.pinHash });
  }
}

/**
 * Close the day in one transaction: attendance, staff earnings into the khata,
 * payments made now, the day's snapshot with its security code, then lock.
 * If anything fails, none of it is saved.
 */
export async function closeDay(user: SessionUser, input: CloseInput): Promise<{ securityCode: string }> {
  const day = await requireOpenDay();
  const actor = actorOf(user);

  // Wrong PINs are audited and counted, so check them before the transaction.
  await verifyPayouts(user, input.payouts);
  const payouts = Object.fromEntries(Object.entries(input.payouts).map(([id, p]) => [id, p.amount]));

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

    // 3. Payments made now, each confirmed with the staff member's PIN above.
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
          pinConfirmed: true,
          createdBy: actor,
        })
        .returning({ id: cashEntries.id });
      await tx.insert(khataEntries).values({
        staffId: member.id,
        businessDate: day.businessDate,
        kind: "payment",
        label: "Payment, PIN confirmed",
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
