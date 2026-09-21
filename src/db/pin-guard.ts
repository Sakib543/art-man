import { and, count, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { auditLog } from "@/db/schema";
import { UserError } from "@/lib/errors";
import { verifyPin } from "@/lib/pin";

/** A PIN has only 10,000 possibilities, so repeated wrong tries are blocked for a while. */
const MAX_WRONG_TRIES = 5;
const LOCK_MINUTES = 15;

interface ConfirmPinInput {
  /** Who is at the screen (for the audit log). */
  actor: string;
  /** Whose PIN is being checked, e.g. "staff:Arshad" or "owner". Wrong tries are counted per subject. */
  subject: string;
  pin: string;
  hash: string | null;
}

/**
 * Check a PIN. A wrong PIN is written to the audit log (failed attempts must
 * be recorded) and counts towards a temporary lock.
 */
export async function confirmPin({ actor, subject, pin, hash }: ConfirmPinInput): Promise<void> {
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000);
  const [{ wrong }] = await db
    .select({ wrong: count() })
    .from(auditLog)
    .where(and(eq(auditLog.action, "pin.wrong"), eq(auditLog.target, subject), gt(auditLog.createdAt, since)));

  if (wrong >= MAX_WRONG_TRIES) {
    throw new UserError(`Too many wrong PINs. Try again in ${LOCK_MINUTES} minutes or ask the Owner.`);
  }
  if (!hash) throw new UserError("No PIN has been set for this person. Ask the Owner to set one.");

  if (!(await verifyPin(pin, hash))) {
    await writeAudit(db, { actor, action: "pin.wrong", target: subject, success: false });
    throw new UserError("Wrong PIN");
  }
}
