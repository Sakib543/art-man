/**
 * What the audit log should record about a sign-in attempt (backlog P3.9).
 *
 * Spec section 11 requires the log to hold failed attempts. A wrong PIN and a
 * wrong password change were already recorded; a wrong *login* was recorded
 * nowhere, so somebody guessing at the owner's password left no trace at all.
 *
 * Pure on purpose: Better Auth's request context is awkward to build in a
 * test, so the decision is made here and the middleware only reads the context.
 */

/** An account name can be anything the browser typed. Keep the log readable. */
const MAX_ACTOR = 64;

export interface SignInAttempt {
  /** The Better Auth route, e.g. "/sign-in/username". */
  path: string;
  /** Whatever was typed in the username (or email) field, if anything. */
  username?: unknown;
  /** The error code when the attempt failed, null when it succeeded. */
  failureCode: string | null;
  /** Where it came from, as the platform's IP header says (P7.12), when it says. */
  ip?: string | null;
}

export interface LoginAuditEntry {
  actor: string;
  action: "login.ok" | "login.failed" | "login.throttled";
  target: string;
  success: boolean;
  after?: { reason?: string; ip?: string; minutesLeft?: number };
}

/** The username as the log records it — and, lower-cased, as the lock counts it (P7.12). */
export const cleanName = (value: unknown): string => clean(value);

const clean = (value: unknown): string => {
  if (typeof value !== "string") return "unknown";
  const trimmed = value.trim();
  if (!trimmed) return "unknown";
  return trimmed.slice(0, MAX_ACTOR);
};

/**
 * The row to write, or null when this request is not a sign-in and nothing
 * should be recorded.
 *
 * Both halves are recorded, not only the failure: "who signed in and when" is
 * the other half of the question the log is asked after a disputed entry, and
 * a failure count means little without the successes around it.
 */
export function loginAuditEntry(attempt: SignInAttempt): LoginAuditEntry | null {
  if (!attempt.path.startsWith("/sign-in/")) return null;

  const who = clean(attempt.username);
  const ip = attempt.ip ? { ip: attempt.ip } : {};
  if (attempt.failureCode === null) {
    return { actor: who, action: "login.ok", target: who, success: true, ...(attempt.ip ? { after: ip } : {}) };
  }
  return {
    actor: who,
    action: "login.failed",
    target: who,
    success: false,
    // The code, not the message: "INVALID_USERNAME_OR_PASSWORD" and
    // "ACCOUNT_CLOSED" are different events and the log should tell them apart.
    after: { reason: clean(attempt.failureCode), ...ip },
  };
}

/**
 * A sign-in refused because the username is locked after too many wrong
 * passwords (P7.12, QA-34). It never reached the password check, so it is not
 * a `login.failed`, and it does not count towards the lock: waiting it out
 * always works. The lock's code is the reason.
 */
export function throttledAuditEntry(username: unknown, reason: string, minutesLeft: number, ip?: string | null): LoginAuditEntry {
  const who = clean(username);
  return {
    actor: who,
    action: "login.throttled",
    target: who,
    success: false,
    after: { reason, minutesLeft, ...(ip ? { ip } : {}) },
  };
}
