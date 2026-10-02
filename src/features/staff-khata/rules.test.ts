import { describe, expect, it } from "vitest";
import {
  bonusLabel,
  cancelledLabel,
  checkBonus,
  checkCancel,
  checkDeduction,
  checkOvertime,
  deductionLabel,
  overtimeLabel,
} from "./rules";

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

describe("overtime and deductions (P3.18)", () => {
  it("adds overtime for an active karigar with a rate, in an open month", () => {
    expect(checkOvertime({ active: true, monthClosed: false, rate: 150 })).toBeNull();
    expect(checkOvertime({ active: false, monthClosed: false, rate: 150 })).toContain("no longer active");
    expect(checkOvertime({ active: true, monthClosed: true, rate: 150 })).toContain("closed");
    expect(checkOvertime({ active: true, monthClosed: false, rate: 0 })).toContain("No overtime rate");
  });

  it("takes a deduction off anyone, a leaver too, but not in a closed month", () => {
    expect(checkDeduction({ monthClosed: false })).toBeNull();
    expect(checkDeduction({ monthClosed: true })).toContain("closed");
  });

  it("writes the lines the khata shows", () => {
    expect(overtimeLabel(3, 150, " wedding party ")).toBe("Overtime 3 h × Rs 150: wedding party");
    expect(overtimeLabel(1.5, 1200, "late")).toBe("Overtime 1.5 h × Rs 1,200: late");
    expect(deductionLabel(" late two hours")).toBe("Deduction: late two hours");
    expect(cancelledLabel("Deduction: late", " wrong person ")).toBe("Cancelled: Deduction: late (wrong person)");
  });
});

describe("checkCancel (P3.18)", () => {
  const open = { isCancellation: false, alreadyCancelled: false, monthClosed: false };

  it("cancels overtime and deductions once, in an open month", () => {
    expect(checkCancel({ ...open, kind: "overtime" })).toBeNull();
    expect(checkCancel({ ...open, kind: "deduction" })).toBeNull();
    expect(checkCancel({ ...open, kind: "overtime", alreadyCancelled: true })).toContain("already been cancelled");
    expect(checkCancel({ ...open, kind: "deduction", monthClosed: true })).toContain("closed");
  });

  it("never cancels a cancellation, or any other line", () => {
    expect(checkCancel({ ...open, kind: "overtime", isCancellation: true })).toContain("Only overtime and deductions");
    for (const kind of ["earning", "payment", "advance", "bonus", "adjustment"] as const) {
      expect(checkCancel({ ...open, kind })).toContain("Only overtime and deductions");
    }
  });
});
