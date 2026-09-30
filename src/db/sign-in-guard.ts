import { and, desc, eq, gt, inArray, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { cleanName } from "@/lib/auth/login-audit";
import { MAX_FAILED_SIGN_INS, SIGN_IN_LOCK_MINUTES, signInLock, type SignInLock } from "@/lib/auth/sign-in-lock";

/**
 * Is this username locked after too many wrong passwords? (backlog P7.12,
 * QA-34; the rule is `lib/auth/sign-in-lock.ts`.)
 *
 * Counted from the audit log, where Better Auth's hook writes every sign-in
 * (`login.ok` / `login.failed`, target: the username as typed): the same rows
 * on every server instance, and nothing a request can reset. By what was
 * typed, case aside, so a username that does not exist is locked like one
 * that does. A successful sign-in, or a password reset by the developer, ends
 * the count — the lock is not something the right person has to wait out.
 *
 * Not atomic with the password check, which runs after it: a burst sent all
 * at once can land a few more wrong tries than the limit before the count
 * sees them, as with any limiter. Better Auth's own, per client, stands in
 * front of this one for bursts (`lib/auth/server.ts`).
 */
export async function signInLockFor(typed: unknown): Promise<SignInLock> {
  const name = cleanName(typed).toLowerCase();
  const now = new Date();
  const windowStart = new Date(now.getTime() - SIGN_IN_LOCK_MINUTES * 60_000);
  const sameName = sql`lower(${auditLog.target}) = ${name}`;

  // `audit_log_created_at_idx` keeps both to the last quarter of an hour.
  const [{ fresh }] = await db
    .select({ fresh: max(auditLog.createdAt) })
    .from(auditLog)
    .where(and(inArray(auditLog.action, ["login.ok", "password.reset", "password.self-reset"]), sameName, gt(auditLog.createdAt, windowStart)));
  const since = fresh && fresh > windowStart ? fresh : windowStart;

  const failures = await db
    .select({ at: auditLog.createdAt })
    .from(auditLog)
    .where(and(eq(auditLog.action, "login.failed"), sameName, gt(auditLog.createdAt, since)))
    .orderBy(desc(auditLog.createdAt))
    .limit(MAX_FAILED_SIGN_INS);

  return signInLock(
    failures.map((row) => row.at),
    now,
  );
}
