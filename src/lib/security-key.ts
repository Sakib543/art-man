import { randomBytes } from "node:crypto";

/**
 * The server's key for security codes (P7.8b, QA-26).
 *
 * A day's code is stored in the database it seals. Hashed without a key,
 * anyone who can change the database directly — the Neon console, a leaked
 * connection string, a restored backup — can change a closed day, work its
 * code out again and write it back, and the next day's too, and every day
 * checks out. With a key the code is an HMAC, and the key is in the server's
 * environment, never in the database or its backups: without it a changed
 * day's code cannot be made again.
 *
 * `SECURITY_CODE_KEY` is one value, `YYYY-MM-DD.<secret>` — `pnpm security-key`
 * makes one. The date is the first business day whose close must be sealed
 * with the key: from it on, a day sealed without the key does not match,
 * so its code cannot be swapped for a plain hash someone worked out. Days
 * before it, sealed before the key was set, are checked as they were sealed.
 * The secret is at least 32 random bytes, base64url. Never change it: every
 * day sealed with it would stop matching.
 */
export interface SecurityKey {
  /** The first business day that must be sealed with the key. */
  since: string;
  key: Buffer;
}

export type SecurityKeyStatus = { state: "set"; since: string } | { state: "not-set" } | { state: "invalid" };

/** 32 bytes of base64url is 43 characters. */
const FORM = /^(\d{4}-\d{2}-\d{2})\.([A-Za-z0-9_-]{43,})$/;

function isDate(text: string): boolean {
  const moment = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(moment.getTime()) && moment.toISOString().slice(0, 10) === text;
}

/**
 * The key in a `SECURITY_CODE_KEY` value; null when there is none. A value in
 * any other form throws: a key set wrongly must not quietly seal days without
 * one. Spaces around it — a copy and paste — are ignored.
 */
export function parseSecurityKey(raw: string | undefined): SecurityKey | null {
  const value = raw?.trim() ?? "";
  if (value === "") return null;
  const match = FORM.exec(value);
  if (!match || !isDate(match[1])) {
    throw new Error("SECURITY_CODE_KEY is not in the form YYYY-MM-DD.<secret>: make one with `pnpm security-key`.");
  }
  return { since: match[1], key: Buffer.from(match[2], "base64url") };
}

/** The server's key, read from its environment each time; null when none is set. */
export function securityKey(): SecurityKey | null {
  return parseSecurityKey(process.env.SECURITY_CODE_KEY);
}

/** Whether the server has a key, without the key itself and without throwing. */
export function securityKeyStatus(): SecurityKeyStatus {
  try {
    const key = securityKey();
    return key ? { state: "set", since: key.since } : { state: "not-set" };
  } catch {
    return { state: "invalid" };
  }
}

/** A new `SECURITY_CODE_KEY` value: `since`, then 32 random bytes. */
export function newSecurityKey(since: string, secret: Uint8Array = randomBytes(32)): string {
  if (!isDate(since)) throw new Error(`Not a date: ${since}`);
  return `${since}.${Buffer.from(secret).toString("base64url")}`;
}
