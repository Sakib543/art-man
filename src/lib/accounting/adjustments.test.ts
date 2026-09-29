import { describe, expect, it } from "vitest";
import { adjustmentEffect, adjustmentTotals, type Adjustment } from "./index";

describe("adjustmentEffect (backlog P3.4)", () => {
  it("a sale that was less than recorded lowers the profit", () => {
    expect(adjustmentEffect({ kind: "sale", amount: -1000, online: false })).toEqual({
      profit: -1000,
      online: 0,
      paidByOwner: 0,
      khata: 0,
    });
  });

  it("an online sale also changes what reached the Owner's bank", () => {
    expect(adjustmentEffect({ kind: "sale", amount: -1000, online: true })).toMatchObject({ profit: -1000, online: -1000 });
  });

  it("more spent than recorded is less profit", () => {
    expect(adjustmentEffect({ kind: "expense", amount: 500, paidFrom: "drawer" })).toEqual({
      profit: -500,
      online: 0,
      paidByOwner: 0,
      khata: 0,
    });
  });

  it("a cost the Owner paid himself is credited back to him", () => {
    expect(adjustmentEffect({ kind: "expense", amount: 500, paidFrom: "owner" })).toMatchObject({ profit: -500, paidByOwner: 500 });
  });

  it("a staff member who earned less than recorded owes it back, and the profit is that much more", () => {
    expect(adjustmentEffect({ kind: "staff_earning", amount: -100 })).toEqual({ profit: 100, online: 0, paidByOwner: 0, khata: -100 });
  });

  it("an advance recorded twice moves only the khata, never the profit (spec 7.1)", () => {
    // They took Rs 2,000 less than the books say, so Rs 2,000 more is owed to them.
    expect(adjustmentEffect({ kind: "staff_taken", amount: -2000 })).toEqual({ profit: 0, online: 0, paidByOwner: 0, khata: 2000 });
  });
});

describe("adjustmentTotals", () => {
  const month: Adjustment[] = [
    { kind: "sale", amount: -1000, online: true },
    { kind: "expense", amount: 500, paidFrom: "owner" },
    { kind: "staff_earning", amount: -100 },
    { kind: "staff_taken", amount: 2000 },
  ];

  it("adds up what the month's report needs", () => {
    // Profit: -1000 - 500 + 100.
    expect(adjustmentTotals(month)).toEqual({ profit: -1400, online: -1000, paidByOwner: 500 });
  });

  it("a cancellation is the adjustment with its sign turned, so the pair comes to nothing", () => {
    const withCancellations = [...month, ...month.map((a) => ({ ...a, amount: -a.amount }))];
    expect(adjustmentTotals(withCancellations)).toEqual({ profit: 0, online: 0, paidByOwner: 0 });
  });

  it("no adjustments, no effect", () => {
    expect(adjustmentTotals([])).toEqual({ profit: 0, online: 0, paidByOwner: 0 });
  });
});
