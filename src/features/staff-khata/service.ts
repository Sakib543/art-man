import { eq } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { getLatestBusinessDay } from "@/db/queries/business-day";
import { isMonthClosed } from "@/db/queries/months";
import { saveOnce } from "@/db/save-once";
import { khataEntries, monthCloses, staff } from "@/db/schema";
import { overtimePay } from "@/lib/accounting";
import type { SessionUser } from "@/lib/auth/session";
import { monthOf, monthStart } from "@/lib/business-date";
import { UserError } from "@/lib/errors";
import {
  bonusLabel,
  cancelledLabel,
  checkBonus,
  checkCancel,
  checkDeduction,
  checkOvertime,
  deductionLabel,
  overtimeLabel,
} from "./rules";
import type { BonusInput, CancelLineInput, DeductionInput, OvertimeInput } from "./schemas";

const actorOf = (user: SessionUser) => user.username || user.name;

/**
 * Give a staff member a bonus (backlog P3.1). Spec §10.10: the Owner alone.
 *
 * It is one khata line and no cash. A bonus is money the salon now owes the
 * staff member; handing it over is an ordinary staff payment in the day's
 * folders, exactly as with a commission. Keeping the two apart is what lets a
 * bonus be given on a day that is already closed: it touches neither the
 * drawer, nor that day's closing figures, nor its security code.
 *
 * It does reach the month's accounts — `getMonthlyReport` counts the month's
 * bonuses as part of what staff earned — which is why a closed month is
 * refused here.
 *
 * Once per client id (P7.2): the dialog sends the same id until it hears back.
 */
export async function giveBonus(current: SessionUser, input: BonusInput): Promise<void> {
  return saveOnce(khataEntries, khataEntries.clientId, input.clientId, () => saveBonus(current, input));
}

async function saveBonus(current: SessionUser, input: BonusInput): Promise<void> {
  const day = await getLatestBusinessDay();
  if (!day) throw new UserError("No business day has been opened yet.");

  const [member] = await db.select().from(staff).where(eq(staff.id, input.staffId)).limit(1);
  if (!member) throw new UserError("That staff member was not found.");

  const problem = checkBonus({ active: member.active, monthClosed: await isMonthClosed(monthOf(day.businessDate)) });
  if (problem) throw new UserError(problem);

  const actor = actorOf(current);
  await db.transaction(async (tx) => {
    await tx.insert(khataEntries).values({
      staffId: member.id,
      businessDate: day.businessDate,
      kind: "bonus",
      label: bonusLabel(input.reason),
      amount: input.amount,
      clientId: input.clientId,
    });
    await writeAudit(tx, {
      actor,
      action: "khata.bonus",
      target: member.name,
      after: { amount: input.amount, reason: input.reason, businessDate: day.businessDate },
    });
  });
}

/** The latest business day and the staff member, or a refusal: what every khata line here starts from. */
async function dayAndMember(staffId: string) {
  const day = await getLatestBusinessDay();
  if (!day) throw new UserError("No business day has been opened yet.");
  const [member] = await db.select().from(staff).where(eq(staff.id, staffId)).limit(1);
  if (!member) throw new UserError("That staff member was not found.");
  return { day, member, monthClosed: await isMonthClosed(monthOf(day.businessDate)) };
}

/**
 * Overtime (backlog P3.18): hours at the karigar's own rate, into the khata,
 * by the Owner or the Manager. Like a bonus it is one khata line and no cash,
 * dated with the latest business day, and counted in the month's profit
 * (`getMonthlyReport`). The rupees are worked out here from the rate on the
 * staff row; the screen sends the hours only.
 *
 * Once per client id (P7.2), as a bonus is.
 */
export async function addOvertime(current: SessionUser, input: OvertimeInput): Promise<void> {
  return saveOnce(khataEntries, khataEntries.clientId, input.clientId, async () => {
    const { day, member, monthClosed } = await dayAndMember(input.staffId);
    const problem = checkOvertime({ active: member.active, monthClosed, rate: member.overtimeRate });
    if (problem) throw new UserError(problem);

    const amount = overtimePay(input.hours, member.overtimeRate);
    await db.transaction(async (tx) => {
      await tx.insert(khataEntries).values({
        staffId: member.id,
        businessDate: day.businessDate,
        kind: "overtime",
        label: overtimeLabel(input.hours, member.overtimeRate, input.reason),
        amount,
        clientId: input.clientId,
      });
      await writeAudit(tx, {
        actor: actorOf(current),
        action: "khata.overtime",
        target: member.name,
        after: { hours: input.hours, rate: member.overtimeRate, amount, reason: input.reason, businessDate: day.businessDate },
      });
    });
  });
}

/**
 * A deduction (P3.18): rupees taken off the khata, with a reason, by the Owner
 * or the Manager. A negative khata line and no cash, counted against what
 * staff earned in the month's profit. Allowed for someone who has left: they
 * may still owe for something.
 */
export async function addDeduction(current: SessionUser, input: DeductionInput): Promise<void> {
  return saveOnce(khataEntries, khataEntries.clientId, input.clientId, async () => {
    const { day, member, monthClosed } = await dayAndMember(input.staffId);
    const problem = checkDeduction({ monthClosed });
    if (problem) throw new UserError(problem);

    await db.transaction(async (tx) => {
      await tx.insert(khataEntries).values({
        staffId: member.id,
        businessDate: day.businessDate,
        kind: "deduction",
        label: deductionLabel(input.reason),
        amount: -input.amount,
        clientId: input.clientId,
      });
      await writeAudit(tx, {
        actor: actorOf(current),
        action: "khata.deduction",
        target: member.name,
        after: { amount: input.amount, reason: input.reason, businessDate: day.businessDate },
      });
    });
  });
}

/**
 * The Owner cancels overtime or a deduction (P3.18) that went in wrong. Khata
 * lines are append-only, so the cancellation is a line of the same kind with
 * the sign turned, pointing back at the first and dated with it — so both
 * fall in the same month, and the month's total for that kind nets to nothing.
 *
 * Once per line: the line is locked first, so two cancels at the same moment
 * are one after the other, and the second finds the first. Everything is read
 * on the transaction: a read through the pool while holding the lock would
 * wait for a connection the waiting cancels hold, and none would ever finish.
 */
export async function cancelKhataLine(current: SessionUser, input: CancelLineInput): Promise<void> {
  await db.transaction(async (tx) => {
    const [line] = await tx.select().from(khataEntries).where(eq(khataEntries.id, input.entryId)).limit(1).for("update");
    if (!line) throw new UserError("That khata line was not found.");

    const [cancellation] = await tx
      .select({ id: khataEntries.id })
      .from(khataEntries)
      .where(eq(khataEntries.reversesEntryId, line.id))
      .limit(1);
    const [closed] = await tx
      .select({ month: monthCloses.month })
      .from(monthCloses)
      .where(eq(monthCloses.month, monthStart(monthOf(line.businessDate))))
      .limit(1);
    const problem = checkCancel({
      kind: line.kind,
      isCancellation: line.reversesEntryId !== null,
      alreadyCancelled: cancellation !== undefined,
      monthClosed: closed !== undefined,
    });
    if (problem) throw new UserError(problem);

    const [member] = await tx.select({ name: staff.name }).from(staff).where(eq(staff.id, line.staffId)).limit(1);
    await tx.insert(khataEntries).values({
      staffId: line.staffId,
      businessDate: line.businessDate,
      kind: line.kind,
      label: cancelledLabel(line.label, input.reason),
      amount: -line.amount,
      reversesEntryId: line.id,
    });
    await writeAudit(tx, {
      actor: actorOf(current),
      action: "khata.cancel",
      target: member?.name ?? line.staffId,
      before: { kind: line.kind, label: line.label, amount: line.amount, businessDate: line.businessDate },
      after: { reason: input.reason },
    });
  });
}
