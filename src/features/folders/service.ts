import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { getOpenBusinessDay } from "@/db/queries/business-day";
import { confirmPin } from "@/db/pin-guard";
import { cashEntries, khataEntries, staff, user } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import { requireOwnerOnOpenMonth, resettleDay } from "@/db/day-settlement";
import type { EntryInput } from "./schemas";

const actorOf = (u: SessionUser) => u.username || u.name;

/** Add an entry to today's folders. Only the Owner's own cash movements need a PIN. */
export async function addEntry(current: SessionUser, input: EntryInput): Promise<void> {
  const day = await getOpenBusinessDay();
  if (!day) throw new UserError("No business day is open. Ask the Owner to open one.");
  const actor = actorOf(current);

  let staffId: string | null = null;
  let staffName = "";

  if (input.kind === "staff_advance") {
    const [member] = await db.select().from(staff).where(eq(staff.id, input.staffId)).limit(1);
    if (!member || !member.active) throw new UserError("That staff member is not available");
    staffId = member.id;
    staffName = member.name;
  }

  if (input.kind === "owner_took" || input.kind === "owner_added") {
    // The owner confirms in person, even when the manager is at the screen.
    const [owner] = await db.select({ pinHash: user.pinHash }).from(user).where(eq(user.role, "owner")).limit(1);
    await confirmPin({ actor, subject: "owner", pin: input.pin, hash: owner?.pinHash ?? null });
  }

  const description =
    input.kind === "staff_advance" ? `Advance to ${staffName}` : input.description;

  await db.transaction(async (tx) => {
    const [entry] = await tx
      .insert(cashEntries)
      .values({
        businessDate: day.businessDate,
        kind: input.kind,
        amount: input.amount,
        description,
        paidFrom: input.kind === "expense" ? input.paidFrom : null,
        staffId,
        // Only the Owner's own cash movements are confirmed with a PIN, above.
        pinConfirmed: input.kind === "owner_took" || input.kind === "owner_added",
        createdBy: actor,
      })
      .returning({ id: cashEntries.id });

    // An advance is money the staff member has taken: it comes off their khata.
    if (input.kind === "staff_advance" && staffId) {
      await tx.insert(khataEntries).values({
        staffId,
        businessDate: day.businessDate,
        kind: "advance",
        label: "Advance",
        amount: -input.amount,
        cashEntryId: entry.id,
      });
    }

    await writeAudit(tx, {
      actor,
      action: `folder.${input.kind}`,
      target: description ?? undefined,
      after: { amount: input.amount, paidFrom: input.kind === "expense" ? input.paidFrom : undefined },
    });
  });
}

/**
 * Cancel an entry. Nothing is edited or deleted: a cancellation row with the
 * negative amount is added, so both stay visible. An entry in a day that is
 * already closed is the Owner's alone, and that day is settled again afterwards
 * so its figures and security code match the correction.
 */
export async function voidEntry(current: SessionUser, entryId: string, reason: string): Promise<void> {
  const day = await getOpenBusinessDay();
  const actor = actorOf(current);

  const [entry] = await db.select().from(cashEntries).where(eq(cashEntries.id, entryId)).limit(1);
  if (!entry) throw new UserError("Entry not found");
  if (entry.voidsEntryId) throw new UserError("A cancellation cannot be cancelled");

  const closedDay = entry.businessDate !== day?.businessDate;
  if (closedDay) await requireOwnerOnOpenMonth(current, entry.businessDate, "entry");

  const [already] = await db
    .select({ id: cashEntries.id })
    .from(cashEntries)
    .where(and(eq(cashEntries.voidsEntryId, entryId)))
    .limit(1);
  if (already) throw new UserError("This entry is already cancelled");

  await db.transaction(async (tx) => {
    const [cancellation] = await tx
      .insert(cashEntries)
      .values({
        businessDate: entry.businessDate,
        kind: entry.kind,
        amount: -entry.amount,
        description: `Cancelled: ${reason}`,
        paidFrom: entry.paidFrom,
        staffId: entry.staffId,
        pinConfirmed: false,
        voidsEntryId: entry.id,
        createdBy: actor,
      })
      .returning({ id: cashEntries.id });

    if (entry.kind === "staff_advance" && entry.staffId) {
      await tx.insert(khataEntries).values({
        staffId: entry.staffId,
        businessDate: entry.businessDate,
        kind: "adjustment",
        label: "Advance cancelled",
        amount: entry.amount,
        cashEntryId: cancellation.id,
      });
    }

    if (closedDay) await resettleDay(tx, entry.businessDate, actor, `${entry.kind} cancelled`);

    await writeAudit(tx, {
      actor,
      action: closedDay ? "folder.cancel-closed-day" : "folder.cancel",
      target: entry.description ?? entry.kind,
      before: { kind: entry.kind, amount: entry.amount },
      after: { reason },
    });
  });
}
