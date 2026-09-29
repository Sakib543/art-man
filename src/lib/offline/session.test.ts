import { describe, expect, it } from "vitest";
import { OFFLINE_TRUST_MS, offlineTrust, trustRefusal } from "./session";

const hour = 60 * 60 * 1000;
const savedAt = Date.UTC(2026, 8, 29, 4, 0); // 09:00 in Karachi

describe("offlineTrust", () => {
  it("allows offline billing for 12 hours after the server last confirmed the sign-in", () => {
    expect(offlineTrust(savedAt, savedAt)).toEqual({ ok: true, until: savedAt + OFFLINE_TRUST_MS });
    expect(offlineTrust(savedAt, savedAt + 11 * hour + 59 * 60_000).ok).toBe(true);
  });

  it("ends at 12 hours, and says since when", () => {
    expect(offlineTrust(savedAt, savedAt + 12 * hour)).toEqual({ ok: false, reason: "expired", since: savedAt });
    expect(offlineTrust(savedAt, savedAt + 30 * hour)).toMatchObject({ ok: false, reason: "expired" });
  });

  it("has nothing to go on without a copy — never signed in here, or signed out", () => {
    expect(offlineTrust(null, savedAt)).toEqual({ ok: false, reason: "no-copy" });
  });

  it("forgives a clock a few minutes behind, but not one set back to stretch the window", () => {
    expect(offlineTrust(savedAt, savedAt - 4 * 60_000).ok).toBe(true);
    expect(offlineTrust(savedAt, savedAt - 2 * hour)).toEqual({ ok: false, reason: "clock", since: savedAt });
  });
});

describe("trustRefusal", () => {
  it("says why, and always sends the counter to the paper bill book", () => {
    const messages = [
      trustRefusal({ ok: false, reason: "no-copy" }),
      trustRefusal({ ok: false, reason: "expired", since: savedAt }),
      trustRefusal({ ok: false, reason: "clock", since: savedAt }),
    ];
    expect(messages.every((message) => message.includes("paper bill book"))).toBe(true);
  });

  it("names when the server last confirmed the sign-in, in Karachi time", () => {
    expect(trustRefusal({ ok: false, reason: "expired", since: savedAt })).toContain("29 Sep 2026, 09:00");
  });

  it("sends a folder entry to be written down instead — it has no paper book (P2.2e)", () => {
    const messages = [
      trustRefusal({ ok: false, reason: "no-copy" }, "entry"),
      trustRefusal({ ok: false, reason: "expired", since: savedAt }, "entry"),
      trustRefusal({ ok: false, reason: "clock", since: savedAt }, "entry"),
    ];
    expect(messages.every((message) => message.includes("Write the entry down"))).toBe(true);
    expect(messages.some((message) => message.includes("paper bill book"))).toBe(false);
    expect(messages[1]).toContain("29 Sep 2026, 09:00");
  });

  it("tells a close to count the drawer and write the count down for later (P2.2f)", () => {
    const messages = [
      trustRefusal({ ok: false, reason: "no-copy" }, "close"),
      trustRefusal({ ok: false, reason: "expired", since: savedAt }, "close"),
      trustRefusal({ ok: false, reason: "clock", since: savedAt }, "close"),
    ];
    expect(messages.every((message) => message.includes("write the count down"))).toBe(true);
    expect(messages.some((message) => message.includes("paper bill book"))).toBe(false);
    expect(messages[1]).toContain("29 Sep 2026, 09:00");
  });
});
