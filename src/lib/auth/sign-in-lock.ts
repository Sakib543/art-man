/**
 * How many wrong passwords an account may take before it is locked for a
 * while (backlog P7.12, QA-34). Pure: the database side is `db/sign-in-guard.ts`.
 *
 * Better Auth's own limiter counts per client address, in each server's
 * memory: on a local build a different `X-Forwarded-For` on every request
 * walked straight through it, every Vercel instance kept its own count, and
 * the attempts it refused were written nowhere. This one counts per
 * *account*, from the audit log — the same rows the Owner reads — so no
 * header can reset it, every instance sees the same count, and every refusal
 * is written down. It is the PIN lock's rule (`db/pin-guard.ts`), for
 * passwords: 5 wrong in 15 minutes.
 */

export const MAX_FAILED_SIGN_INS = 5;
export const SIGN_IN_LOCK_MINUTES = 15;

/** The code the refusal carries, for the login screen (`sign-in-error.ts`) and the audit log. */
export const SIGN_IN_LOCKED = "TOO_MANY_ATTEMPTS";

export type SignInLock = { locked: false } | { locked: true; minutesLeft: number };

/**
 * `failures`: the account's wrong sign-ins since its last successful one or
 * password reset, within the window, newest first. Locked while the window
 * holds `MAX_FAILED_SIGN_INS` of them — until the oldest of those ages out.
 * A refused attempt is not a failure: waiting the lock out always works.
 */
export function signInLock(failures: readonly Date[], now: Date): SignInLock {
  const windowMs = SIGN_IN_LOCK_MINUTES * 60_000;
  const recent = failures.filter((at) => now.getTime() - at.getTime() < windowMs);
  if (recent.length < MAX_FAILED_SIGN_INS) return { locked: false };
  const sorted = [...recent].sort((a, b) => b.getTime() - a.getTime());
  const unlockAt = sorted[MAX_FAILED_SIGN_INS - 1].getTime() + windowMs;
  return { locked: true, minutesLeft: Math.max(1, Math.ceil((unlockAt - now.getTime()) / 60_000)) };
}

/**
 * What the login screen shows. The same for a username that does not exist —
 * it is counted by what was typed — so it reveals nothing about which do.
 */
export function signInLockedMessage(minutesLeft: number): string {
  const minutes = `${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}`;
  return `Too many wrong passwords for this username. Try again in ${minutes}, or ask the developer to reset the password.`;
}

/**
 * The client's address, from the one header this platform sets itself
 * (`CLIENT_IP_HEADER`; Vercel overwrites `X-Forwarded-For`). With several
 * hops, the last is the one the platform's own proxy saw; anything a client
 * typed is to its left. For the audit log only — the lock does not use it.
 */
export function clientIpOf(headers: Headers | null | undefined, header: string): string | null {
  const value = headers?.get(header);
  if (!value) return null;
  const hops = value
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  const last = hops[hops.length - 1];
  return last ? last.slice(0, 64) : null;
}
