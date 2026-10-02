import { describe, expect, it } from "vitest";
import { bonusLabel, checkBonus } from "./rules";

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
