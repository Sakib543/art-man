import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { isMonthClosed } from "@/db/queries/months";
import { fixedExpenseLines, monthlyExpenses } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { monthOf, monthStart } from "@/lib/business-date";
import { UserError } from "@/lib/errors";
import type { AddOtherInput, SetFixedInput } from "./schemas";

const actorOf = (user: SessionUser) => user.username || user.name;

async function requireOpenMonth(month: string) {
  if (await isMonthClosed(month)) throw new UserError("This month is closed and frozen. Corrections go into next month.");
}

/**
 * Set a fixed line's amount for a month. The old amount is never overwritten:
 * a new entry for the difference is added, so the history stays visible.
 */
export async function setFixedAmount(user: SessionUser, input: SetFixedInput): Promise<void> {
  await requireOpenMonth(input.month);

  const [line] = await db.select().from(fixedExpenseLines).where(eq(fixedExpenseLines.id, input.lineId)).limit(1);
  if (!line) throw new UserError("That expense line does not exist");

  const rows = await db
    .select({ amount: monthlyExpenses.amount })
    .from(monthlyExpenses)
    .where(and(eq(monthlyExpenses.month, monthStart(input.month)), eq(monthlyExpenses.kind, "fixed"), eq(monthlyExpenses.label, line.name)));
  const current = rows.reduce((sum, row) => sum + row.amount, 0);

  const difference = input.amount - current;
  if (difference === 0) return;

  const actor = actorOf(user);
  await db.transaction(async (tx) => {
    await tx.insert(monthlyExpenses).values({
      month: monthStart(input.month),
      kind: "fixed",
      label: line.name,
      amount: difference,
      reason: current === 0 ? null : `Changed from ${current} to ${input.amount}`,
      paidFrom: line.paidByOwner ? "owner" : "drawer",
      createdBy: actor,
    });
    await writeAudit(tx, {
      actor,
      action: "expense.fixed",
      target: `${line.name} ${input.month}`,
      before: { amount: current },
      after: { amount: input.amount },
    });
  });
}

export async function addFixedLine(user: SessionUser, name: string, paidByOwner: boolean): Promise<void> {
  const existing = await db.select({ name: fixedExpenseLines.name }).from(fixedExpenseLines);
  if (existing.some((row) => row.name.toLowerCase() === name.toLowerCase())) throw new UserError("A line with that name already exists");

  await db.transaction(async (tx) => {
    await tx.insert(fixedExpenseLines).values({ name, paidByOwner });
    await writeAudit(tx, { actor: actorOf(user), action: "expense.line-add", target: name, after: { paidByOwner } });
  });
}

export async function addOther(user: SessionUser, input: AddOtherInput): Promise<void> {
  await requireOpenMonth(input.month);
  const actor = actorOf(user);

  await db.transaction(async (tx) => {
    await tx.insert(monthlyExpenses).values({
      month: monthStart(input.month),
      kind: "other",
      label: "Other",
      amount: input.amount,
      reason: input.reason,
      paidFrom: input.paidFrom,
      createdBy: actor,
    });
    await writeAudit(tx, { actor, action: "expense.other", target: input.reason, after: { amount: input.amount, paidFrom: input.paidFrom } });
  });
}

/** Cancel an "other" expense by adding a negative row that points back at it. Nothing is deleted. */
export async function voidOther(user: SessionUser, entryId: string, reason: string): Promise<void> {
  const [entry] = await db.select().from(monthlyExpenses).where(eq(monthlyExpenses.id, entryId)).limit(1);
  if (!entry) throw new UserError("Entry not found");
  if (entry.kind !== "other" || entry.voidsId) throw new UserError("Only an expense entry can be cancelled");
  await requireOpenMonth(monthOf(entry.month));

  const [already] = await db.select({ id: monthlyExpenses.id }).from(monthlyExpenses).where(eq(monthlyExpenses.voidsId, entryId)).limit(1);
  if (already) throw new UserError("This entry is already cancelled");

  const actor = actorOf(user);
  await db.transaction(async (tx) => {
    await tx.insert(monthlyExpenses).values({
      month: entry.month,
      kind: "other",
      label: "Other",
      amount: -entry.amount,
      reason: `Cancelled: ${reason}`,
      paidFrom: entry.paidFrom,
      voidsId: entry.id,
      createdBy: actor,
    });
    await writeAudit(tx, {
      actor,
      action: "expense.cancel",
      target: entry.reason ?? "expense",
      before: { amount: entry.amount },
      after: { reason },
    });
  });
}
