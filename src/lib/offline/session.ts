/**
 * How long the counter may bill offline on one sign-in (backlog P2.2d).
 *
 * The client's answer (2026-09-26): **12 hours**, surviving a closed browser
 * and a reload, counted from the last time the server confirmed the sign-in.
 * That confirmation is the offline copy (P2.2b): the server hands it only to a
 * signed-in session, and every signed-in screen fetches it again at least every
 * 15 minutes while online. So the window is 12 hours from when this browser
 * last saved a copy.
 *
 * Pure: times are passed in, in milliseconds, by this device's clock.
 */

import { formatDateTime } from "@/lib/format";

export const OFFLINE_TRUST_MS = 12 * 60 * 60 * 1000;

/**
 * A clock that runs a little behind is forgiven; one set back further than
 * this looks like an attempt to stretch the window, so it ends it.
 */
const CLOCK_SLACK_MS = 5 * 60 * 1000;

export type OfflineTrust =
  | { ok: true; until: number }
  | { ok: false; reason: "no-copy" }
  | { ok: false; reason: "expired"; since: number }
  | { ok: false; reason: "clock"; since: number };

/** May offline billing run now, on a copy saved at `savedAt`? */
export function offlineTrust(savedAt: number | null, now: number): OfflineTrust {
  if (savedAt === null) return { ok: false, reason: "no-copy" };
  if (now < savedAt - CLOCK_SLACK_MS) return { ok: false, reason: "clock", since: savedAt };
  const until = savedAt + OFFLINE_TRUST_MS;
  return now < until ? { ok: true, until } : { ok: false, reason: "expired", since: savedAt };
}

/** What the counter is told when offline billing cannot run — and what to do instead. */
export function trustRefusal(trust: Exclude<OfflineTrust, { ok: true }>): string {
  switch (trust.reason) {
    case "no-copy":
      return "Offline billing is not ready on this computer: it needs one sign-in here while the internet is on. Use the paper bill book.";
    case "expired":
      return `Offline billing has ended: the server last confirmed this sign-in on ${formatDateTime(new Date(trust.since))}, more than 12 hours ago. Use the paper bill book until the internet is back.`;
    case "clock":
      return "This computer's clock has been set back, so offline billing cannot run. Use the paper bill book.";
  }
}
