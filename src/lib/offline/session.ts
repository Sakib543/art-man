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

/**
 * May offline billing run now, on a copy saved at `savedAt`?
 *
 * `seen` is the latest time this browser's clock has shown (`noteClock`,
 * `lib/offline/store.ts`) — a mark that only moves forward. Until P7.18
 * (QA-33) only the copy's own time was the floor: at 19:30 a clock set back to
 * 08:30 was handed another 11½ hours, and again, for ever. Now a clock behind
 * the latest it has shown ends the window as one behind the copy does.
 */
export function offlineTrust(savedAt: number | null, now: number, seen: number | null = null): OfflineTrust {
  if (savedAt === null) return { ok: false, reason: "no-copy" };
  const latest = Math.max(savedAt, seen ?? savedAt);
  if (now < latest - CLOCK_SLACK_MS) return { ok: false, reason: "clock", since: latest };
  const until = savedAt + OFFLINE_TRUST_MS;
  return now < until ? { ok: true, until } : { ok: false, reason: "expired", since: savedAt };
}

/**
 * What the counter is told when offline billing cannot run — and what to do
 * instead. `"entry"` is for a folder entry (P2.2e), which has no paper book:
 * it is written down and entered when the internet is back. `"close"` is for
 * Day Close (P2.2f): the drawer can still be counted, and the count written
 * down for the close once the internet is back.
 */
export function trustRefusal(
  trust: Exclude<OfflineTrust, { ok: true }>,
  what: "bill" | "entry" | "close" = "bill",
): string {
  if (what === "close") {
    const instead = "Count the drawer, write the count down, and close the day when the internet is back.";
    switch (trust.reason) {
      case "no-copy":
        return `The day cannot be closed offline on this computer yet: it needs one sign-in here while the internet is on. ${instead}`;
      case "expired":
        return `Working offline has ended: the server last confirmed this sign-in on ${formatDateTime(new Date(trust.since))}, more than 12 hours ago. ${instead}`;
      case "clock":
        return `This computer's clock has been set back, so the day cannot be closed offline. ${instead}`;
    }
  }

  if (what === "entry") {
    const instead = "Write the entry down and enter it on Daily folders when the internet is back.";
    switch (trust.reason) {
      case "no-copy":
        return `Entries cannot be kept offline on this computer yet: it needs one sign-in here while the internet is on. ${instead}`;
      case "expired":
        return `Working offline has ended: the server last confirmed this sign-in on ${formatDateTime(new Date(trust.since))}, more than 12 hours ago. ${instead}`;
      case "clock":
        return `This computer's clock has been set back, so nothing can be kept offline. ${instead}`;
    }
  }

  switch (trust.reason) {
    case "no-copy":
      return "Offline billing is not ready on this computer: it needs one sign-in here while the internet is on. Use the paper bill book.";
    case "expired":
      return `Offline billing has ended: the server last confirmed this sign-in on ${formatDateTime(new Date(trust.since))}, more than 12 hours ago. Use the paper bill book until the internet is back.`;
    case "clock":
      return "This computer's clock has been set back, so offline billing cannot run. Use the paper bill book.";
  }
}
