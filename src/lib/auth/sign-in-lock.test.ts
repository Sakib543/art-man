import { describe, expect, it } from "vitest";
import { clientIpOf, MAX_FAILED_SIGN_INS, signInLock, signInLockedMessage, SIGN_IN_LOCK_MINUTES } from "./sign-in-lock";

const NOW = new Date("2026-10-01T10:00:00Z");
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

describe("the account lock (P7.12, QA-34)", () => {
  it("is 5 wrong passwords in 15 minutes, as for the Owner's PIN", () => {
    expect(MAX_FAILED_SIGN_INS).toBe(5);
    expect(SIGN_IN_LOCK_MINUTES).toBe(15);
  });

  it("stays open below the limit", () => {
    expect(signInLock([], NOW)).toEqual({ locked: false });
    expect(signInLock([1, 2, 3, 4].map(minutesAgo), NOW)).toEqual({ locked: false });
  });

  it("locks at the limit, until the oldest of the last five ages out of the window", () => {
    // Five wrong tries, the oldest 3 minutes ago: 12 minutes left.
    expect(signInLock([0, 1, 1, 2, 3].map(minutesAgo), NOW)).toEqual({ locked: true, minutesLeft: 12 });
  });

  it("counts only the window: tries older than 15 minutes are forgotten", () => {
    expect(signInLock([1, 2, 3, 4, 16, 20].map(minutesAgo), NOW)).toEqual({ locked: false });
  });

  it("never says 0 minutes while locked", () => {
    const lock = signInLock([0, 0, 0, 0, 14.99].map(minutesAgo), NOW);
    expect(lock).toEqual({ locked: true, minutesLeft: 1 });
  });

  it("does not care about the order the tries come in", () => {
    expect(signInLock([3, 0, 2, 1, 1].map(minutesAgo), NOW)).toEqual({ locked: true, minutesLeft: 12 });
  });
});

describe("what a locked username is told", () => {
  it("says how long, and the way out", () => {
    expect(signInLockedMessage(12)).toBe(
      "Too many wrong passwords for this username. Try again in 12 minutes, or ask the developer to reset the password.",
    );
    expect(signInLockedMessage(1)).toContain("in 1 minute,");
  });
});

describe("the client's address, for the audit log", () => {
  it("is the header's value, or the last hop when there are several", () => {
    expect(clientIpOf(new Headers({ "x-forwarded-for": "203.0.113.7" }), "x-forwarded-for")).toBe("203.0.113.7");
    // What a client typed is on the left; the platform's proxy adds the address it saw on the right.
    expect(clientIpOf(new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" }), "x-forwarded-for")).toBe("203.0.113.7");
    expect(clientIpOf(new Headers({ "x-real-ip": "203.0.113.9" }), "x-real-ip")).toBe("203.0.113.9");
  });

  it("is nothing without the header", () => {
    expect(clientIpOf(new Headers(), "x-forwarded-for")).toBeNull();
    expect(clientIpOf(undefined, "x-forwarded-for")).toBeNull();
    expect(clientIpOf(new Headers({ "x-forwarded-for": " , " }), "x-forwarded-for")).toBeNull();
  });
});
