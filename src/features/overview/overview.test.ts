import { describe, expect, it } from "vitest";
import type { DayBill } from "@/db/queries/day-bills";
import { buildAlerts } from "./alerts";
import { buildFeed, type FeedEntry } from "./feed";

const bill = (billNo: number, at: string, over: Partial<DayBill>): DayBill => ({
  id: `b${billNo}`,
  billNo,
  createdAt: at,
  customerName: null,
  total: 800,
  cash: 800,
  online: 0,
  bookNo: null,
  status: "active",
  cancelReason: null,
  reversesBillNo: null,
  lines: [],
  ...over,
});

describe("buildFeed", () => {
  const bills = [
    bill(1, "2026-09-21T08:00:00.000Z", { customerName: "Ashfaq Bhai" }),
    bill(2, "2026-09-21T09:00:00.000Z", { status: "cancelled", cancelReason: "Wrong rate" }),
    bill(3, "2026-09-21T09:00:01.000Z", { status: "reversal", reversesBillNo: 2, total: -800 }),
  ];
  const entries: FeedEntry[] = [
    { id: "e1", createdAt: "2026-09-21T08:30:00.000Z", kind: "expense", amount: 300, description: "Tea", staffName: null, isVoid: false },
    { id: "e2", createdAt: "2026-09-21T10:00:00.000Z", kind: "staff_advance", amount: 1000, description: null, staffName: "Arshad", isVoid: false },
  ];
  const feed = buildFeed(bills, entries);

  it("lists bills and entries together, newest first", () => {
    expect(feed.map((f) => f.id)).toEqual(["e2", "b3", "b2", "e1", "b1"]);
  });

  it("describes each kind of item", () => {
    const byId = Object.fromEntries(feed.map((f) => [f.id, f]));
    expect(byId.b1).toMatchObject({ text: "Bill #1 for Ashfaq Bhai", tone: "good" });
    expect(byId.b2).toMatchObject({ text: "Bill #2 cancelled", sub: "Reason: Wrong rate", tone: "bad" });
    expect(byId.b3).toMatchObject({ text: "Reversal for #2", sub: "-Rs 800" });
    expect(byId.e1).toMatchObject({ text: "Expense: Tea", sub: "Rs 300" });
    expect(byId.e2).toMatchObject({ text: "Advance to Arshad", sub: "Rs 1,000" });
  });

  it("keeps only the newest items up to the limit", () => {
    expect(buildFeed(bills, entries, 2).map((f) => f.id)).toEqual(["e2", "b3"]);
  });
});

describe("buildAlerts", () => {
  const none = { cancelledToday: 0, lastClose: null, wrongPins24h: 0 };

  it("is empty when all is well", () => {
    expect(buildAlerts(none)).toEqual([]);
  });

  it("warns at three or more cancelled bills, and only mentions fewer", () => {
    expect(buildAlerts({ ...none, cancelledToday: 3 })[0].tone).toBe("warn");
    expect(buildAlerts({ ...none, cancelledToday: 1 })[0]).toMatchObject({ tone: "info", text: expect.stringContaining("1 bill cancelled") });
  });

  it("flags a short drawer with its reason, and mentions extra cash gently", () => {
    const short = buildAlerts({ ...none, lastClose: { businessDate: "2026-09-21", difference: -100, reason: "Wrong change" } });
    expect(short[0]).toMatchObject({ tone: "warn", text: expect.stringContaining("short Rs 100") });
    expect(short[0].text).toContain("Wrong change");
    const extra = buildAlerts({ ...none, lastClose: { businessDate: "2026-09-21", difference: 50, reason: null } });
    expect(extra[0].tone).toBe("info");
  });

  it("says nothing about a drawer that matched", () => {
    expect(buildAlerts({ ...none, lastClose: { businessDate: "2026-09-21", difference: 0, reason: null } })).toEqual([]);
  });

  it("reports wrong PIN attempts", () => {
    expect(buildAlerts({ ...none, wrongPins24h: 1 })[0].text).toContain("1 wrong PIN attempt in");
    expect(buildAlerts({ ...none, wrongPins24h: 4 })[0].tone).toBe("warn");
  });
});
