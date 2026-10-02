import { describe, expect, it } from "vitest";
import {
  buildMonthReport,
  monthlyExpenseTotals,
  recalculateMonthReport,
  type MonthDay,
  type MonthlyExpenseEntry,
  type MonthReportInput,
} from "./index";

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
    bonuses: 0,
    overtime: 0,
    deductions: 0,
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

  it("a bonus is a staff cost, so it comes off the profit (P3.1)", () => {
    // Same month, plus a Rs 2,000 bonus: 23000 - 2000.
    const r = buildMonthReport({ ...base, bonuses: 2000 });
    expect(r.bonuses).toBe(2000);
    expect(r.netProfit).toBe(21000);
  });

  it("overtime is a staff cost and a deduction comes off it (P3.18)", () => {
    // 23000 - 1500 of overtime + 400 of deductions.
    const r = buildMonthReport({ ...base, overtime: 1500, deductions: 400 });
    expect(r).toMatchObject({ overtime: 1500, deductions: 400, staffEarned: 8000, bonuses: 0 });
    expect(r.netProfit).toBe(23000 - 1500 + 400);
    // A deduction is not cash: the Owner's money is moved by the profit alone.
    expect(r.owner.heldByBusiness).toBe(buildMonthReport(base).owner.heldByBusiness - 1100);
  });

  it("a bonus is not folded into what day close earned", () => {
    // Day close works out commission and wage from the bills; a bonus is the
    // Owner's own decision and is counted separately, so the two never overlap.
    const r = buildMonthReport({ ...base, bonuses: 2000 });
    expect(r.staffEarned).toBe(8000);
  });

  it("a bonus leaves the owner's own account alone, beyond the profit it reduces", () => {
    const r = buildMonthReport({ ...base, bonuses: 2000 });
    expect(r.owner.reachedOwner).toBe(22000);
    expect(r.owner.heldByBusiness).toBe(21000 - 22000);
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

  it("without adjustments the report says so, rather than leaving the fields out (P3.4)", () => {
    const r = buildMonthReport(base);
    expect(r.adjustments).toBe(0);
    expect(r.adjustmentsToOwner).toBe(0);
  });

  it("an adjustment for a closed month counts in this month's profit, beside the days, not inside them (P3.4)", () => {
    const r = buildMonthReport({ ...base, adjustments: { profit: -1000, online: 0, paidByOwner: 0 } });
    expect(r.netProfit).toBe(23000 - 1000);
    expect(r.adjustments).toBe(-1000);
    // "Total sales" stays the sum of this month's closed days.
    expect(r.sales).toBe(50000);
    expect(r.dayProfitTotal).toBe(50000 - 3000 - 8000);
  });

  it("a cash sale that never came in lowers what the business holds as well", () => {
    const r = buildMonthReport({ ...base, adjustments: { profit: -1000, online: 0, paidByOwner: 0 } });
    expect(r.owner.heldByBusiness).toBe(buildMonthReport(base).owner.heldByBusiness - 1000);
  });

  it("an online sale that never came in leaves the business's balance alone: it was the Owner's bank that was short", () => {
    const r = buildMonthReport({ ...base, adjustments: { profit: -1000, online: -1000, paidByOwner: 0 } });
    expect(r.adjustmentsToOwner).toBe(-1000);
    expect(r.owner.heldByBusiness).toBe(buildMonthReport(base).owner.heldByBusiness);
    // What reached the Owner this month is this month's own money only.
    expect(r.owner.reachedOwner).toBe(22000);
  });

  it("a cost the Owner paid himself, corrected later, leaves the business's balance alone too", () => {
    const r = buildMonthReport({ ...base, adjustments: { profit: -500, online: 0, paidByOwner: 500 } });
    expect(r.netProfit).toBe(23000 - 500);
    expect(r.adjustmentsToOwner).toBe(-500);
    expect(r.owner.heldByBusiness).toBe(buildMonthReport(base).owner.heldByBusiness);
  });

  it("an empty month has no profit and nothing held", () => {
    const r = buildMonthReport({ ...base, days: [], monthlyExpenses: [], salaries: 0, bonuses: 0, ownerTookCash: 0 });
    expect(r).toMatchObject({ closedDays: 0, sales: 0, netProfit: 0 });
    expect(r.owner.heldByBusiness).toBe(0);
  });
});

describe("recalculateMonthReport (P1.10)", () => {
  const base: MonthReportInput = {
    days,
    monthlyExpenses: [{ kind: "fixed", amount: 10000, paidFrom: "drawer" }],
    salaries: 6000,
    bonuses: 0,
    overtime: 0,
    deductions: 0,
    ownerTookCash: 12000,
    dailyExpensesPaidByOwner: 0,
    capitalRepaid: 0,
  };

  // The month as it closed, in each shape the report can take.
  const closedMonths: [string, MonthReportInput][] = [
    ["a plain month", base],
    ["a bonus", { ...base, bonuses: 2000 }],
    ["overtime and a deduction", { ...base, overtime: 1500, deductions: 400 }],
    ["rent the Owner paid himself", { ...base, monthlyExpenses: [{ kind: "fixed", amount: 10000, paidFrom: "owner" }] }],
    ["daily expenses the Owner paid", { ...base, dailyExpensesPaidByOwner: 2000 }],
    ["capital repaid", { ...base, capitalRepaid: 5000 }],
    ["an adjustment for an earlier month", { ...base, adjustments: { profit: -1000, online: -1000, paidByOwner: 0 } }],
  ];

  // What changing a bill in place does to the days. The staff were paid in
  // cash at the close, so what they were paid never moves.
  const cashSaleLower = [{ ...day(29000, 6000, 2000, 4900), staffPaid: 5000 }, days[1]];
  const onlineWasCash = [day(30000, 5000, 2000, 5000), days[1]];
  const onlineSaleHigher = [days[0], { ...day(20500, 4500, 1000, 3050), staffPaid: 3000 }];
  const corrections: [string, MonthDay[]][] = [
    ["a cash sale Rs 1,000 lower, and its commission", cashSaleLower],
    ["an online payment that was really cash", onlineWasCash],
    ["a sale Rs 500 higher, paid online", onlineSaleHigher],
  ];

  const cases = closedMonths.flatMap(([month, input]) => corrections.map(([change, corrected]) => [month, change, input, corrected] as const));

  it.each(cases)("%s, then %s: the report the close would have saved from the corrected days", (_month, _change, input, corrected) => {
    const closed = buildMonthReport(input);
    expect(recalculateMonthReport(closed, corrected)).toEqual(buildMonthReport({ ...input, days: corrected }));
  });

  it("nothing moved, nothing changes", () => {
    const closed = buildMonthReport(base);
    expect(recalculateMonthReport(closed, days)).toEqual(closed);
  });

  it("the salaries stay as the month closed with them, whatever the staff are paid today", () => {
    // It is never told today's salaries: only the closed report and the days.
    const r = recalculateMonthReport(buildMonthReport(base), cashSaleLower);
    expect(r.salaries).toBe(6000);
    // Rs 1,000 less sale, Rs 100 less commission: 23000 - 1000 + 100.
    expect(r.netProfit).toBe(22100);
  });

  it("an online payment that was really cash moves the Owner account, not the profit", () => {
    const closed = buildMonthReport(base);
    const r = recalculateMonthReport(closed, onlineWasCash);
    expect(r.netProfit).toBe(closed.netProfit);
    expect(r.owner.reachedOwner).toBe(closed.owner.reachedOwner - 1000);
    expect(r.owner.heldByBusiness).toBe(closed.owner.heldByBusiness + 1000);
  });
});
