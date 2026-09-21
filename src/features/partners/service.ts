import { eq } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { isMonthClosed } from "@/db/queries/months";
import { partnerDrawings, partners } from "@/db/schema";
import { checkShares } from "@/lib/accounting";
import type { SessionUser } from "@/lib/auth/session";
import { monthOf, monthStart } from "@/lib/business-date";
import { UserError } from "@/lib/errors";

const actorOf = (user: SessionUser) => user.username || user.name;

/**
 * Save the partners' names and profit shares. This is configuration: it applies
 * from now on. A month already closed keeps the shares saved when it closed.
 */
export async function saveShares(user: SessionUser, input: { id: string; name: string; sharePct: number }[]): Promise<void> {
  const current = await db.select().from(partners).where(eq(partners.active, true));
  if (input.length !== current.length || input.some((p) => !current.some((c) => c.id === p.id))) {
    throw new UserError("The partner list changed. Reload the page and try again.");
  }

  const check = checkShares(input.map((p) => p.sharePct));
  if (!check.ok) throw new UserError(`Shares must add up to 100%. They add up to ${check.total}%.`);

  const actor = actorOf(user);
  await db.transaction(async (tx) => {
    for (const partner of input) {
      await tx.update(partners).set({ name: partner.name, sharePct: partner.sharePct }).where(eq(partners.id, partner.id));
    }
    await writeAudit(tx, {
      actor,
      action: "partners.shares",
      before: current.map((p) => ({ name: p.name, sharePct: p.sharePct })),
      after: input.map((p) => ({ name: p.name, sharePct: p.sharePct })),
    });
  });
}

/** A new partner starts with 0%, so the total is still 100. The Owner then sets the shares. */
export async function addPartner(user: SessionUser, name: string): Promise<void> {
  const existing = await db.select({ name: partners.name }).from(partners);
  if (existing.some((p) => p.name.toLowerCase() === name.toLowerCase())) throw new UserError("A partner with that name already exists");

  await db.transaction(async (tx) => {
    await tx.insert(partners).values({ name, sharePct: 0 });
    await writeAudit(tx, { actor: actorOf(user), action: "partners.add", target: name });
  });
}

export async function addDrawing(user: SessionUser, input: { partnerId: string; month: string; amount: number; note?: string }): Promise<void> {
  if (await isMonthClosed(input.month)) throw new UserError("This month is closed and frozen. Corrections go into next month.");

  const [partner] = await db.select({ id: partners.id, name: partners.name }).from(partners).where(eq(partners.id, input.partnerId)).limit(1);
  if (!partner) throw new UserError("Partner not found");

  const actor = actorOf(user);
  await db.transaction(async (tx) => {
    await tx.insert(partnerDrawings).values({
      partnerId: partner.id,
      month: monthStart(input.month),
      amount: input.amount,
      note: input.note || null,
      createdBy: actor,
    });
    await writeAudit(tx, { actor, action: "partners.draw", target: partner.name, after: { amount: input.amount, month: input.month } });
  });
}

/** Cancel a drawing by adding a negative row that points back at it. Nothing is deleted. */
export async function voidDrawing(user: SessionUser, drawingId: string, reason: string): Promise<void> {
  const [entry] = await db.select().from(partnerDrawings).where(eq(partnerDrawings.id, drawingId)).limit(1);
  if (!entry) throw new UserError("Entry not found");
  if (entry.voidsId) throw new UserError("A cancellation cannot be cancelled");
  if (await isMonthClosed(monthOf(entry.month))) throw new UserError("This month is closed and frozen.");

  const [already] = await db.select({ id: partnerDrawings.id }).from(partnerDrawings).where(eq(partnerDrawings.voidsId, drawingId)).limit(1);
  if (already) throw new UserError("This entry is already cancelled");

  const actor = actorOf(user);
  await db.transaction(async (tx) => {
    await tx.insert(partnerDrawings).values({
      partnerId: entry.partnerId,
      month: entry.month,
      amount: -entry.amount,
      note: `Cancelled: ${reason}`,
      voidsId: entry.id,
      createdBy: actor,
    });
    await writeAudit(tx, { actor, action: "partners.draw-cancel", target: entry.note ?? "drawing", before: { amount: entry.amount }, after: { reason } });
  });
}
