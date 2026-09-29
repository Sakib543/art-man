import { describe, expect, it } from "vitest";
import { checkShares, partnerAccount, partnerShares, recalculateShares, type ClosedShare } from "./index";

describe("checkShares", () => {
  it("accepts shares that add up to 100", () => {
    expect(checkShares([50, 50])).toEqual({ ok: true, total: 100 });
    expect(checkShares([33.3, 33.3, 33.4])).toEqual({ ok: true, total: 100 });
  });

  it("rejects shares that do not, and negative shares", () => {
    expect(checkShares([50, 40])).toEqual({ ok: false, total: 90 });
    expect(checkShares([60, 50])).toEqual({ ok: false, total: 110 });
    expect(checkShares([120, -20]).ok).toBe(false);
  });
});

describe("partnerAccount", () => {
  it("net position = profit share + capital still owed - drawn", () => {
    const account = partnerAccount({ profitShare: 60000, injected: 200000, repaid: 50000, drawn: 20000 });
    expect(account).toMatchObject({ owed: 150000, netPosition: 190000 });
  });

  it("a partner with no capital only has profit less drawings", () => {
    expect(partnerAccount({ profitShare: 30000, injected: 0, repaid: 0, drawn: 10000 }).netPosition).toBe(20000);
  });

  it("a loss month lowers what the business owes", () => {
    expect(partnerAccount({ profitShare: -50000, injected: 100000, repaid: 0, drawn: 0 }).netPosition).toBe(50000);
  });

  it("works with the shares split: 50/50 of an odd profit still adds up", () => {
    const shares = partnerShares(250001, [
      { id: "a", sharePct: 50 },
      { id: "b", sharePct: 50 },
    ]);
    expect(shares.a + shares.b).toBe(250001);
  });
});

describe("recalculateShares (P1.10)", () => {
  // As Month close saved them for a net profit of Rs 23,000.
  const closed: ClosedShare[] = [
    { partnerId: "a", name: "Asif", sharePct: 60, amount: 13800 },
    { partnerId: "b", name: "Bilal", sharePct: 40, amount: 9200 },
  ];

  it("splits the corrected profit with the percentages the month closed with", () => {
    expect(recalculateShares(closed, 22100)).toEqual([
      { partnerId: "a", name: "Asif", sharePct: 60, amount: 13260 },
      { partnerId: "b", name: "Bilal", sharePct: 40, amount: 8840 },
    ]);
  });

  it("is the split the close itself would have made", () => {
    const atClose = partnerShares(22101, [
      { id: "a", sharePct: 60 },
      { id: "b", sharePct: 40 },
    ]);
    expect(recalculateShares(closed, 22101).map((share) => share.amount)).toEqual([atClose.a, atClose.b]);
  });

  it("the saved order settles who gets a leftover rupee, as it did at close", () => {
    const halves: ClosedShare[] = [
      { partnerId: "c", name: "C", sharePct: 50, amount: 0 },
      { partnerId: "d", name: "D", sharePct: 50, amount: 0 },
    ];
    const pairs = (shares: ClosedShare[]) => shares.map((share) => [share.partnerId, share.amount]);
    expect(pairs(recalculateShares(halves, 1001))).toEqual([["c", 501], ["d", 500]]);
    expect(pairs(recalculateShares([...halves].reverse(), 1001))).toEqual([["d", 501], ["c", 500]]);
  });

  it("a loss is shared the same way", () => {
    expect(recalculateShares(closed, -1000).map((share) => share.amount)).toEqual([-600, -400]);
  });
});
