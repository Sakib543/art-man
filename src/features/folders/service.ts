import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { getOpenBusinessDay } from "@/db/queries/business-day";
import { confirmPin } from "@/db/pin-guard";
import { auditLog, cashEntries, khataEntries, staff, user } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { isUniqueViolation, UserError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { requireOwnerOnOpenMonth, resettleDay } from "@/db/day-settlement";
import type { DiscardOfflineEntryInput, EntryInput, OfflineEntryOrigin, SyncEntryInput } from "./schemas";

const actorOf = (u: SessionUser) => u.username || u.name;

/** A Save's answer (P2.2e): whether this id had been saved before, so nothing was saved twice. */
export interface SavedEntry {
  alreadySaved: boolean;
}

/** Has an entry with this id been saved already? (P2.2e) */
async function savedEarlier(clientId: string | null): Promise<boolean> {
  if (!clientId) return false;
  const [row] = await db
    .select({ id: cashEntries.id })
    .from(cashEntries)
    .where(eq(cashEntries.clientId, clientId))
    .limit(1);
  return Boolean(row);
}

/**
 * Add an entry to today's folders — once, however many times the same entry
 * is sent (P2.2e). Only the Owner's own cash movements need a PIN.
 *
 * `offline` is set when the counter made the entry with no internet and the
 * outbox sent it later. Such an entry goes into the day it was made on or
 * nowhere: put into whichever day happens to be open when the connection
 * comes back, its money would land in the wrong day's cash count. The id check
 * comes first, so an entry that did arrive — a send whose answer was lost — is
 * answered as saved even after its day has closed.
 */
export async function addEntry(current: SessionUser, input: EntryInput, offline?: OfflineEntryOrigin): Promise<SavedEntry> {
  if (await savedEarlier(input.clientId)) return { alreadySaved: true };

  const day = await getOpenBusinessDay();
  if (!day) throw new UserError("No business day is open. Ask the Owner to open one.");
  if (offline && offline.businessDate !== day.businessDate) {
    throw new UserError(
      `This entry was made on ${formatDate(offline.businessDate)}, but the open day is ${formatDate(day.businessDate)}. An entry made offline is only saved into the day it was made on.`,
    );
  }
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

  try {
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
          // Unique: a second insert with the same id fails, and is answered
          // below as already saved (P2.2e).
          clientId: input.clientId,
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
        after: {
          amount: input.amount,
          paidFrom: input.kind === "expense" ? input.paidFrom : undefined,
          // Made with no internet (P2.2e): when and by whom, as the browser
          // tells it. The entry's own time is when it reached the server.
          ...(offline ? { offline: { madeAt: offline.madeAt, madeBy: offline.madeBy } } : {}),
        },
      });
    });
  } catch (error) {
    // Two sends of one entry at the same instant both got past `savedEarlier`;
    // the unique index let one in, and this one is answered as saved.
    if (isUniqueViolation(error) && (await savedEarlier(input.clientId))) return { alreadySaved: true };
    throw error;
  }
  return { alreadySaved: false };
}

/** How much of what the browser sent a refusal keeps, at most. */
const REFUSAL_RECORD_LIMIT = 20_000;

/**
 * An entry made offline that the server refused goes to the audit log
 * (P2.2e), as a refused bill does (P2.2c): the money moved at the counter, so
 * the server keeps a note of it even though the books do not have it. The
 * entry it may later become shares its id (`target`, `cash_entries.client_id`).
 */
export async function recordOfflineEntryRefusal(user: SessionUser, clientId: string | null, reason: string, sent: unknown) {
  const text = JSON.stringify(sent) ?? "";
  await writeAudit(db, {
    actor: actorOf(user),
    action: "folder.offline-refuse",
    target: clientId ? `offline entry ${clientId}` : "offline entry",
    after: { reason, sent: text.length <= REFUSAL_RECORD_LIMIT ? sent : `(${text.length} characters, not kept)` },
    success: false,
  });
}

/**
 * Save an entry the counter made offline, sent by the outbox (P2.2e) —
 * through `addEntry`, with where it came from. A refusal is recorded before it
 * is passed on.
 */
export async function syncOfflineEntry(current: SessionUser, input: SyncEntryInput): Promise<SavedEntry> {
  const { clientId, entry, businessDate, madeAt, madeBy } = input;
  try {
    return await addEntry(current, { ...entry, clientId }, { businessDate, madeAt, madeBy });
  } catch (error) {
    if (error instanceof UserError) await recordOfflineEntryRefusal(current, clientId, error.message, input);
    throw error;
  }
}

/**
 * An entry made offline that the server refused, taken off the counter's
 * list by a person, with a reason (P2.2e). Nothing reaches the books — the
 * entry never did — but it goes to the audit log as the counter kept it.
 *
 * If a send whose answer was lost had saved it after all, it is in the books
 * and there is nothing to discard: `saved` says so, and nothing is written.
 * Written once per entry, however often it is asked (P2.2c found why).
 */
export async function discardOfflineEntry(
  current: SessionUser,
  input: DiscardOfflineEntryInput,
): Promise<{ saved: boolean }> {
  if (await savedEarlier(input.clientId)) return { saved: true };

  const action = "folder.offline-discard";
  const target = `offline entry ${input.clientId}`;
  // `audit_log_action_target_created_at_idx` answers this.
  const [already] = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(and(eq(auditLog.action, action), eq(auditLog.target, target)))
    .limit(1);
  if (already) return { saved: false };

  await writeAudit(db, { actor: actorOf(current), action, target, after: { reason: input.reason, entry: input.entry } });
  return { saved: false };
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
