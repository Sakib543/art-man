import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { getLatestBusinessDay } from "@/db/queries/business-day";
import { isMonthClosed } from "@/db/queries/months";
import { capitalContributions, capitalItems, capitalRepayments, partners } from "@/db/schema";
import { contributionsMatch, funderPosition } from "@/lib/accounting";
import type { SessionUser } from "@/lib/auth/session";
import { monthOf } from "@/lib/business-date";
import { UserError } from "@/lib/errors";
import { rs } from "@/lib/format";
import type { AddInvestmentInput, AddRepaymentInput } from "./schemas";

const actorOf = (user: SessionUser) => user.username || user.name;

/** A new partner-funded investment. It is capital, not an expense: it never touches net profit. */
export async function addInvestment(user: SessionUser, input: AddInvestmentInput): Promise<void> {
  const contributions = input.contributions.filter((c) => c.amount > 0);
  if (contributions.length === 0) throw new UserError("Enter who contributed how much");

  const partnerIds = contributions.map((c) => c.partnerId);
  if (new Set(partnerIds).size !== partnerIds.length) throw new UserError("A partner is listed twice");

  const known = await db.select({ id: partners.id }).from(partners);
  if (partnerIds.some((id) => !known.some((p) => p.id === id))) throw new UserError("One of the partners does not exist");

  const match = contributionsMatch(input.totalCost, contributions.map((c) => c.amount));
  if (!match.ok) {
    throw new UserError(
      match.difference > 0
        ? `Contributions are ${rs(match.difference)} short of the total cost`
        : `Contributions are ${rs(-match.difference)} more than the total cost`,
    );
  }

  const actor = actorOf(user);
  await db.transaction(async (tx) => {
    const [item] = await tx.insert(capitalItems).values({ name: input.name, totalCost: input.totalCost }).returning({ id: capitalItems.id });
    await tx.insert(capitalContributions).values(contributions.map((c) => ({ capitalItemId: item.id, partnerId: c.partnerId, amount: c.amount })));
    await writeAudit(tx, { actor, action: "capital.add", target: input.name, after: { totalCost: input.totalCost, contributions } });
  });
}

/** An installment paid back to a partner. It lowers what the business owes; it is not an expense. */
export async function addRepayment(user: SessionUser, input: AddRepaymentInput): Promise<void> {
  const [contribution] = await db
    .select()
    .from(capitalContributions)
    .where(and(eq(capitalContributions.capitalItemId, input.capitalItemId), eq(capitalContributions.partnerId, input.partnerId)))
    .limit(1);
  if (!contribution) throw new UserError("That partner did not fund this investment");

  const paidRows = await db
    .select({ amount: capitalRepayments.amount })
    .from(capitalRepayments)
    .where(and(eq(capitalRepayments.capitalItemId, input.capitalItemId), eq(capitalRepayments.partnerId, input.partnerId)));
  const { remaining } = funderPosition(contribution.amount, paidRows.map((r) => r.amount));

  if (input.amount > remaining) {
    throw new UserError(remaining === 0 ? "This partner has been fully repaid" : `Only ${rs(remaining)} is left to repay this partner`);
  }

  // Dated with the business day it happens on.
  const day = await getLatestBusinessDay();
  if (!day) throw new UserError("Open a business day first");
  if (await isMonthClosed(monthOf(day.businessDate))) throw new UserError("This month is closed and frozen.");

  const actor = actorOf(user);
  await db.transaction(async (tx) => {
    await tx.insert(capitalRepayments).values({
      capitalItemId: input.capitalItemId,
      partnerId: input.partnerId,
      amount: input.amount,
      paidOn: day.businessDate,
      note: input.note || null,
      createdBy: actor,
    });
    await writeAudit(tx, { actor, action: "capital.repay", target: input.capitalItemId, after: { partnerId: input.partnerId, amount: input.amount } });
  });
}
