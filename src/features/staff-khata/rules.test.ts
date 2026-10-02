import { describe, expect, it } from "vitest";
import { bonusLabel, checkBonus, payNote } from "./rules";

describe("checkBonus", () => {
  it("allows a bonus for an active member in an open month", () => {
    expect(checkBonus({ active: true, monthClosed: false })).toBeNull();
  });

  it("refuses one for somebody who has left", () => {
    expect(checkBonus({ active: false, monthClosed: false })).toContain("no longer active");
  });

  it("refuses one in a closed month, because the report and the shares are frozen", () => {
    expect(checkBonus({ active: true, monthClosed: true })).toContain("closed");
  });

  it("names the month problem even when the member is also inactive", () => {
    // The member is the thing the Owner can see on the screen, so it is said first.
    expect(checkBonus({ active: false, monthClosed: true })).toContain("no longer active");
  });
});

describe("bonusLabel", () => {
  it("keeps the Owner's own words", () => {
    expect(bonusLabel("Eid")).toBe("Bonus: Eid");
  });

  it("trims what was typed", () => {
    expect(bonusLabel("  good month  ")).toBe("Bonus: good month");
  });
});

describe("payNote: when each part of the pay reaches the khata (P3.17)", () => {
  it("says the same as before for the spec's three types", () => {
    expect(payNote(1, 25000)).toBe("Monthly salary of Rs 25,000 is added at month end.");
    expect(payNote(2, 25000)).toBe("Commission is added every night at Day Close. Monthly salary of Rs 25,000 is added at month end.");
    expect(payNote(3, 0)).toBe("Daily wage and commission are added every night at Day Close.");
  });

  it("covers the new mixes", () => {
    expect(payNote(4, 0)).toBe("Commission is added every night at Day Close.");
    expect(payNote(5, 25000)).toBe("Daily wage is added every night at Day Close. Monthly salary of Rs 25,000 is added at month end.");
    expect(payNote(6, 25000)).toBe(
      "Daily wage and commission are added every night at Day Close. Monthly salary of Rs 25,000 is added at month end.",
    );
    expect(payNote(7, 0)).toBe("Daily wage is added every night at Day Close.");
  });
});
