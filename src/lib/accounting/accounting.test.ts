import { describe, expect, it } from "vitest";
import {
  advanceOutstanding,
  allocate,
  capitalSummary,
  cashDifference,
  commissionOn,
  commissionReversal,
  countedTotal,
  dayEarning,
  dayProfit,
  expectedCash,
  khataBalance,
  netProfit,
  ownerAccount,
  partnerShares,
  salesTotals,
  splitDealPrice,
  workByStaff,
  type Bill,
  type StaffPay,
} from "./index";

// Worked examples below come straight from Art_Salon_Dev_Spec.md.

const sherry: StaffPay = { payType: 3, salary: 0, dailyWage: 800, commissionRate: 10 };
const hamid: StaffPay = { payType: 2, salary: 40000, dailyWage: 0, commissionRate: 10 };
const monthlyOnly: StaffPay = { payType: 1, salary: 50000, dailyWage: 0, commissionRate: 10 };

describe("allocate / deal split (spec 6.3)", () => {
  it("splits the VIP deal by list price and sums to the deal price", () => {
    expect(splitDealPrice(2000, [800, 400, 1800])).toEqual([533, 267, 1200]);
  });

  it("always sums to the total", () => {
    const parts = allocate(1001, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1001);
  });

  it("handles a negative total (loss) without losing rupees", () => {
    const parts = allocate(-100, [50, 50]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(-100);
  });

  it("rejects weights that add up to zero", () => {
    expect(() => allocate(100, [0, 0])).toThrow();
  });
});

describe("commission and daily earning (spec 6.1, 6.2)", () => {
  it("Sherry: work 5000 + wage 800 + 10% = earning 1300", () => {
    const e = dayEarning(sherry, 5000, true);
    expect(e).toEqual({ work: 5000, commission: 500, wage: 800, total: 1300 });
  });

  it("type 3 absent earns no wage but keeps commission", () => {
    expect(dayEarning(sherry, 1000, false).total).toBe(100);
  });

  it("type 2 earns commission only", () => {
    expect(dayEarning(hamid, 1200, true).total).toBe(120);
  });

  it("type 1 earns nothing daily", () => {
    expect(dayEarning(monthlyOnly, 9000, true).total).toBe(0);
  });

  it("deal share: 10% of the 1200 facial share = 120", () => {
    const [, , facial] = splitDealPrice(2000, [800, 400, 1800]);
    expect(commissionOn(facial, 10)).toBe(120);
  });

  it("commission is on the charged amount (special rate), not list price", () => {
    expect(commissionOn(1500, 10)).toBe(150);
  });
});

describe("work per staff and cancelled bills (spec 11)", () => {
  it("a cancelled bill and its reversal net to zero", () => {
    const bills: Bill[] = [
      { status: "cancelled", lines: [{ staffId: "a", amount: 500 }], cash: 500, online: 0 },
      { status: "reversal", lines: [{ staffId: "a", amount: -500 }], cash: -500, online: 0 },
      { status: "active", lines: [{ staffId: "a", amount: 1500 }], cash: 1500, online: 0 },
    ];
    expect(workByStaff(bills)).toEqual({ a: 1500 });
    expect(salesTotals(bills)).toEqual({ cash: 1500, online: 0, sale: 1500 });
  });
});

describe("khata (spec 6.2)", () => {
  it("Sherry ends the day with a zero balance after being paid", () => {
    expect(
      khataBalance([
        { kind: "earning", amount: 1300 },
        { kind: "payment", amount: -1300 },
      ]),
    ).toBe(0);
  });

  it("taking more than earned shows as an advance", () => {
    const entries = [
      { kind: "earning" as const, amount: 1000 },
      { kind: "advance" as const, amount: -3000 },
    ];
    expect(khataBalance(entries)).toBe(-2000);
    expect(advanceOutstanding(entries)).toBe(2000);
  });

  it("a cancelled bill reverses its commission", () => {
    const entries = [{ kind: "earning" as const, amount: 150 }, commissionReversal(150)];
    expect(khataBalance(entries)).toBe(0);
  });
});

describe("day close (spec 5.4)", () => {
  it("expected cash follows the drawer formula", () => {
    expect(
      expectedCash({
        openingCash: 5000,
        cashSales: 10000,
        ownerAdded: 1000,
        expensesFromDrawer: 900,
        staffAdvances: 1000,
        staffPayments: 1300,
        ownerTook: 3000,
      }),
    ).toBe(9800);
  });

  it("classifies the difference and requires a reason only when short", () => {
    expect(cashDifference(9800, 9800)).toEqual({
      difference: 0,
      kind: "match",
      reasonRequired: false,
    });
    expect(cashDifference(9700, 9800)).toMatchObject({ difference: -100, kind: "short", reasonRequired: true });
    expect(cashDifference(9900, 9800)).toMatchObject({ difference: 100, kind: "extra", reasonRequired: false });
  });

  it("adds up counted notes", () => {
    expect(countedTotal({ 5000: 2, 1000: 3, 500: 1 })).toBe(13500);
  });

  it("day profit = sale - expenses - staff earned", () => {
    expect(dayProfit({ sale: 10000, expenses: 900, staffEarned: 1300 })).toBe(7800);
  });
});

describe("monthly accounts (spec 7)", () => {
  it("net profit ignores advances and owner cash withdrawals", () => {
    expect(
      netProfit({ totalSales: 500000, dailyExpenses: 40000, monthlyExpenses: 110000, staffEarnings: 100000 }),
    ).toBe(250000);
  });

  it("owner account example A: 250k profit, 100k online, 80k cash -> 70k held", () => {
    expect(
      ownerAccount({ netProfit: 250000, onlineReceived: 100000, cashTaken: 80000, paidFromOwnPocket: 0 }),
    ).toEqual({ reachedOwner: 180000, netReachedOwner: 180000, heldByBusiness: 70000 });
  });

  it("owner account example B: owner paid 60k rent -> 120k reached, 130k held", () => {
    expect(
      ownerAccount({ netProfit: 250000, onlineReceived: 100000, cashTaken: 80000, paidFromOwnPocket: 60000 }),
    ).toEqual({ reachedOwner: 180000, netReachedOwner: 120000, heldByBusiness: 130000 });
  });

  it("splits profit 50/50 and always adds up", () => {
    const shares = partnerShares(250001, [
      { id: "a", sharePct: 50 },
      { id: "b", sharePct: 50 },
    ]);
    expect(shares.a + shares.b).toBe(250001);
  });

  it("rejects partner shares that do not add up to 100%", () => {
    expect(() =>
      partnerShares(1000, [
        { id: "a", sharePct: 50 },
        { id: "b", sharePct: 40 },
      ]),
    ).toThrow();
  });
});

describe("capital / outstanding (spec 8.2)", () => {
  it("solar 300,000, one 50,000 installment -> 250,000 remaining", () => {
    expect(capitalSummary(300000, [50000])).toEqual({ total: 300000, paid: 50000, remaining: 250000 });
  });
});
