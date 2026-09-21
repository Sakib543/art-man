import { describe, expect, it } from "vitest";
import { buildSummaryText } from "./summary-text";
import type { SnapshotRow } from "./types";

const snapshot: SnapshotRow = {
  businessDate: "2026-09-21",
  sale: 6200,
  cash: 5200,
  online: 1000,
  expenses: 2300,
  staffEarned: 1420,
  staffPaid: 2300,
  dayProfit: 2480,
  openingCash: 5000,
  expectedCash: 4600,
  countedCash: 4600,
  difference: 0,
  diffReason: null,
  securityCode: "A3F9-7C21-0B8E",
  closedBy: "manager",
  closedAt: "2026-09-21T16:00:00.000Z",
  cancelledBills: 1,
};

describe("buildSummaryText", () => {
  it("summarises a day that matches", () => {
    const text = buildSummaryText(snapshot);
    expect(text).toContain("21 Sep 2026 closed");
    expect(text).toContain("Sales Rs 6,200 (cash Rs 5,200, online Rs 1,000)");
    expect(text).toContain("No difference");
    expect(text).toContain("Security code A3F9-7C21-0B8E");
  });

  it("states a shortage with its reason", () => {
    const text = buildSummaryText({ ...snapshot, countedCash: 4500, difference: -100, diffReason: "Wrong change" });
    expect(text).toContain("Short Rs 100: Wrong change");
  });

  it("states extra cash", () => {
    expect(buildSummaryText({ ...snapshot, countedCash: 4700, difference: 100 })).toContain("Extra Rs 100");
  });
});
