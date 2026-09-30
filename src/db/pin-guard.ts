import { and, asc, count, eq, gt, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { auditLog, user } from "@/db/schema";
import { UserError } from "@/lib/errors";
import { verifyPin } from "@/lib/pin";

/** A PIN has only 10,000 possibilities, so repeated wrong tries are blocked for a while. */
const MAX_WRONG_TRIES = 5;
const LOCK_MINUTES = 15;

/** Wrong tries are counted under this `audit_log` target, for every Owner together. */
const SUBJECT = "owner";

type PinCheck = { ok: true; owner: string } | { ok: false; error: string };

/**
 * Check the Owner's PIN, which confirms the Owner's own cash: taken from the
 * drawer, added to it, or either of them cancelled. Answers whose PIN it was,
 * for the audit log.
 *
 * Only an open Owner account's PIN counts, and any open Owner's does (P7.1,
 * QA-10): the PIN used to be read from whichever Owner row came back first,
 * closed accounts included.
 *
 * A wrong PIN is written to the audit log and counts towards a lock. The count,
 * the check and that record run one at a time — a transaction holding an
 * advisory lock — so PINs sent all at once cannot each read the count before
 * any of them is recorded (P7.1, QA-07: twenty sent at once were all checked).
 * Everything inside runs on `tx`: a second connection taken from the pool while
 * this one waits on the lock could run the pool dry.
 */
export async function confirmOwnerPin(actor: string, pin: string): Promise<string> {
  const check = await db.transaction(async (tx): Promise<PinCheck> => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`pin:${SUBJECT}`}, 0))`);

    const since = new Date(Date.now() - LOCK_MINUTES * 60_000);
    const [{ wrong }] = await tx
      .select({ wrong: count() })
      .from(auditLog)
      .where(and(eq(auditLog.action, "pin.wrong"), eq(auditLog.target, SUBJECT), gt(auditLog.createdAt, since)));
    if (wrong >= MAX_WRONG_TRIES) {
      return { ok: false, error: `Too many wrong PINs. Try again in ${LOCK_MINUTES} minutes or ask the Owner.` };
    }

    const owners = await tx
      .select({ username: user.username, name: user.name, pinHash: user.pinHash })
      .from(user)
      .where(and(eq(user.role, "owner"), eq(user.active, true), isNotNull(user.pinHash)))
      .orderBy(asc(user.createdAt));
    if (owners.length === 0) return { ok: false, error: "No PIN has been set for the Owner. The Owner sets one in Settings." };

    for (const owner of owners) {
      if (await verifyPin(pin, owner.pinHash!)) return { ok: true, owner: owner.username || owner.name };
    }
    await writeAudit(tx, { actor, action: "pin.wrong", target: SUBJECT, success: false });
    return { ok: false, error: "Wrong PIN" };
  });

  // Thrown only once the transaction has committed: thrown inside it, the
  // record of a wrong PIN would be rolled back and never count.
  if (!check.ok) throw new UserError(check.error);
  return check.owner;
}
