import { describe, expect, it } from "vitest";
import { buildMonthReport, monthlyExpenseTotals, type MonthDay, type MonthlyExpenseEntry } from "./index";

const day = (sale: number, online: number, expenses: number, staffEarned: number): MonthDay => ({
  sale,
  cash: sale - online,
  online,
  expenses,
  staffEarned,
  staffPaid: staffEarned,
  dayProfit: sale - expenses - staffEarned,
});

const days = [day(30000, 6000, 2000, 5000), day(20000, 4000, 1000, 3000)];

describe("monthlyExpenseTotals", () => {
  const entries: MonthlyExpenseEntry[] = [
    { kind: "fixed", amount: 60000, paidFrom: "owner" },
    { kind: "fixed", amount: 8000, paidFrom: "drawer" },
    { kind: "other", amount: 4000, paidFrom: "drawer" },
    { kind: "other", amount: -4000, paidFrom: "drawer" },
    { kind: "other", amount: 1500, paidFrom: "drawer" },
  ];

  it("splits fixed from others and nets out cancellations", () => {
    expect(monthlyExpenseTotals(entries)).toEqual({ fixed: 68000, others: 1500, total: 69500, paidByOwner: 60000 });
  });

  it("an empty month is all zeros", () => {
    expect(monthlyExpenseTotals([])).toEqual({ fixed: 0, others: 0, total: 0, paidByOwner: 0 });
  });
});

describe("buildMonthReport", () => {
  const base = {
    days,
    monthlyExpenses: [{ kind: "fixed", amount: 10000, paidFrom: "drawer" }] as MonthlyExpenseEntry[],
    salaries: 6000,
    ownerTookCash: 12000,
    dailyExpensesPaidByOwner: 0,
    capitalRepaid: 0,
  };

  it("adds the days up", () => {
    const r = buildMonthReport(base);
    expect(r).toMatchObject({ closedDays: 2, sales: 50000, online: 10000, cash: 40000, dailyExpenses: 3000, staffEarned: 8000 });
  });

  it("net profit = sales - daily expenses - monthly expenses - staff earnings - salaries", () => {
    // 50000 - 3000 - 10000 - (8000 + 6000)
    expect(buildMonthReport(base).netProfit).toBe(23000);
  });

  it("the days' own profits are shown before monthly costs", () => {
    expect(buildMonthReport(base).dayProfitTotal).toBe(50000 - 3000 - 8000);
  });

  it("owner account: online plus cash taken has reached the owner", () => {
    const r = buildMonthReport(base);
    expect(r.owner).toEqual({ reachedOwner: 22000, netReachedOwner: 22000, heldByBusiness: 1000 });
  });

  it("rent the owner paid himself is credited back to him (spec 7.2, example B)", () => {
    const r = buildMonthReport({
      ...base,
      monthlyExpenses: [{ kind: "fixed", amount: 10000, paidFrom: "owner" }],
    });
    expect(r.owner.netReachedOwner).toBe(22000 - 10000);
    expect(r.owner.heldByBusiness).toBe(r.netProfit - 12000);
  });

  it("owner-paid daily expenses are credited back too", () => {
    const r = buildMonthReport({ ...base, dailyExpensesPaidByOwner: 2000 });
    expect(r.owner.netReachedOwner).toBe(20000);
  });

  it("capital repaid to partners lowers what the business holds but never the net profit", () => {
    const without = buildMonthReport(base);
    const withRepay = buildMonthReport({ ...base, capitalRepaid: 5000 });
    expect(withRepay.netProfit).toBe(without.netProfit);
    expect(withRepay.owner.heldByBusiness).toBe(without.owner.heldByBusiness - 5000);
  });

  it("an empty month has no profit and nothing held", () => {
    const r = buildMonthReport({ ...base, days: [], monthlyExpenses: [], salaries: 0, ownerTookCash: 0 });
    expect(r).toMatchObject({ closedDays: 0, sales: 0, netProfit: 0 });
    expect(r.owner.heldByBusiness).toBe(0);
  });
});
