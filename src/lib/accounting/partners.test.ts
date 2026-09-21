import { describe, expect, it } from "vitest";
import { checkShares, partnerAccount, partnerShares } from "./index";

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
