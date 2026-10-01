import { eq } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { getLatestBusinessDay } from "@/db/queries/business-day";
import { isMonthClosed } from "@/db/queries/months";
import { saveOnce } from "@/db/save-once";
import { khataEntries, monthAdjustments, staff } from "@/db/schema";
import { adjustmentEffect } from "@/lib/accounting";
import type { SessionUser } from "@/lib/auth/session";
import { formatMonth, monthOf, monthStart } from "@/lib/business-date";
import { isUniqueViolation, UserError } from "@/lib/errors";
import { cancelBlocker, isStaffKind, khataCancelLabel, khataLabel, recordBlocker, signedAmount } from "./rules";
import type { CancelAdjustmentInput, RecordAdjustmentInput } from "./schemas";

const actorOf = (user: SessionUser) => user.username || user.name;

/**
 * Record an adjustment for a closed month (backlog P3.4, spec §7.4). The
 * Owner's alone, like closing the month.
 *
 * The closed month is not touched. The adjustment counts in the month of the
 * latest business day, which must be open: in its profit, and so in its
 * partners' shares when it is closed. When it is about a staff member's pay it
 * is written into their khata as well, dated with that business day, as a
 * bonus is (P3.1).
 *
 * No cash moves. It puts the books right; money that changes hands now —
 * a refund, a payment to a staff member — goes through Daily folders as usual.
 *
 * Once per client id (P7.2): the dialog sends the same id until it hears back.
 */
export async function recordAdjustment(user: SessionUser, input: RecordAdjustmentInput): Promise<void> {
  return saveOnce(monthAdjustments, monthAdjustments.clientId, input.clientId, () => saveAdjustment(user, input));
}

async function saveAdjustment(user: SessionUser, input: RecordAdjustmentInput): Promise<void> {
  const latest = await getLatestBusinessDay();
  const current = latest ? monthOf(latest.businessDate) : null;
  const [correctsClosed, currentClosed] = await Promise.all([
    isMonthClosed(input.correctsMonth),
    current ? isMonthClosed(current) : Promise.resolve(false),
  ]);

  const problem = recordBlocker({ corrects: input.correctsMonth, correctsClosed, current, currentClosed });
  if (problem) throw new UserError(problem);
  if (!latest || !current) throw new UserError("No business day has been opened yet.");

  let member: { id: string; name: string } | null = null;
  if (isStaffKind(input.kind)) {
    if (!input.staffId) throw new UserError("Choose a staff member");
    const [row] = await db.select({ id: staff.id, name: staff.name }).from(staff).where(eq(staff.id, input.staffId)).limit(1);
    if (!row) throw new UserError("That staff member was not found.");
    member = row;
  }

  const amount = signedAmount(input.direction, input.amount);
  // Kept only where they mean something, so a row never carries a stray answer.
  const online = input.kind === "sale" ? input.online : null;
  const paidFrom = input.kind === "expense" ? input.paidFrom : null;
  const effect = adjustmentEffect({ kind: input.kind, amount, online, paidFrom });
  const actor = actorOf(user);

  await db.transaction(async (tx) => {
    let khataEntryId: string | null = null;
    if (member) {
      const [line] = await tx
        .insert(khataEntries)
        .values({
          staffId: member.id,
          businessDate: latest.businessDate,
          kind: "adjustment",
          label: khataLabel(input.correctsMonth, input.reason),
          amount: effect.khata,
        })
        .returning({ id: khataEntries.id });
      khataEntryId = line.id;
    }

    await tx.insert(monthAdjustments).values({
      month: monthStart(current),
      correctsMonth: monthStart(input.correctsMonth),
      kind: input.kind,
      amount,
      online,
      paidFrom,
      staffId: member?.id ?? null,
      khataEntryId,
      reason: input.reason,
      clientId: input.clientId,
      createdBy: actor,
    });

    await writeAudit(tx, {
      actor,
      action: "month.adjust",
      target: formatMonth(input.correctsMonth),
      after: {
        countsIn: current,
        kind: input.kind,
        amount,
        online,
        paidFrom,
        staff: member?.name ?? null,
        reason: input.reason,
        profit: effect.profit,
        khata: effect.khata,
      },
    });
  });
}

/**
 * Cancel an adjustment, while the month it counts in is still open. Nothing is
 * deleted: a row of the opposite sign points back at it, and a khata line it
 * wrote is reversed the way every khata line is.
 */
export async function cancelAdjustment(user: SessionUser, input: CancelAdjustmentInput): Promise<void> {
  const [row] = await db.select().from(monthAdjustments).where(eq(monthAdjustments.id, input.adjustmentId)).limit(1);
  if (!row) throw new UserError("That adjustment was not found.");

  const countsIn = monthOf(row.month);
  const [[already], countsInClosed, latest] = await Promise.all([
    db.select({ id: monthAdjustments.id }).from(monthAdjustments).where(eq(monthAdjustments.voidsId, row.id)).limit(1),
    isMonthClosed(countsIn),
    getLatestBusinessDay(),
  ]);

  const problem = cancelBlocker({ isCancellation: row.voidsId !== null, cancelled: already !== undefined, countsIn, countsInClosed });
  if (problem) throw new UserError(problem);
  if (!latest) throw new UserError("No business day has been opened yet.");

  const corrects = monthOf(row.correctsMonth);
  const actor = actorOf(user);

  try {
    await db.transaction(async (tx) => {
      let khataEntryId: string | null = null;
      if (row.khataEntryId) {
        const [line] = await tx.select().from(khataEntries).where(eq(khataEntries.id, row.khataEntryId)).limit(1);
        if (!line) throw new UserError("The khata line of this adjustment was not found.");
        const [reversal] = await tx
          .insert(khataEntries)
          .values({
            staffId: line.staffId,
            businessDate: latest.businessDate,
            kind: "adjustment",
            label: khataCancelLabel(corrects, input.reason),
            amount: -line.amount,
            reversesEntryId: line.id,
          })
          .returning({ id: khataEntries.id });
        khataEntryId = reversal.id;
      }

      await tx.insert(monthAdjustments).values({
        month: row.month,
        correctsMonth: row.correctsMonth,
        kind: row.kind,
        amount: -row.amount,
        online: row.online,
        paidFrom: row.paidFrom,
        staffId: row.staffId,
        khataEntryId,
        reason: `Cancelled: ${input.reason}`,
        voidsId: row.id,
        createdBy: actor,
      });

      await writeAudit(tx, {
        actor,
        action: "month.adjust-cancel",
        target: formatMonth(corrects),
        before: { countsIn, kind: row.kind, amount: row.amount, reason: row.reason },
        after: { reason: input.reason },
      });
    });
  } catch (error) {
    // Two cancellations at the same moment: `voids_id` is unique, so the
    // second is refused by the database and nothing of it is kept.
    if (isUniqueViolation(error)) throw new UserError("This adjustment is already cancelled.");
    throw error;
  }
}
