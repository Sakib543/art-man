import { describe, expect, it } from "vitest";
import {
  commissionRateFor,
  dayEarning,
  dayPayOf,
  isMonthlySalaryLabel,
  isPayType,
  monthlySalaryLabel,
  monthlySalaryOf,
  normalizeStaffPay,
  PAY_PARTS,
  PAY_TYPE_LABEL,
  PAY_TYPES,
  payTypeOf,
  paysCommission,
  paysDailyWage,
  paysSalary,
  summarizeDay,
  type PayType,
} from "./index";

const messy = { salary: 40000, dailyWage: 800, commissionRate: 10 };

describe("normalizeStaffPay", () => {
  it("type 1 keeps only the salary", () => {
    expect(normalizeStaffPay({ payType: 1, ...messy })).toEqual({
      payType: 1,
      salary: 40000,
      dailyWage: 0,
      commissionRate: 0,
    });
  });

  it("type 2 keeps salary and commission", () => {
    expect(normalizeStaffPay({ payType: 2, ...messy })).toEqual({
      payType: 2,
      salary: 40000,
      dailyWage: 0,
      commissionRate: 10,
    });
  });

  it("type 3 keeps daily wage and commission", () => {
    expect(normalizeStaffPay({ payType: 3, ...messy })).toEqual({
      payType: 3,
      salary: 0,
      dailyWage: 800,
      commissionRate: 10,
    });
  });
});

describe("dayPayOf: the pay a day's close is given (P7.13, QA-08)", () => {
  it("never carries the salary, even when handed a whole pay", () => {
    for (const payType of PAY_TYPES) {
      expect(dayPayOf({ payType, ...messy })).not.toHaveProperty("salary");
    }
  });

  it("keeps the wage and the rate only where the pay type pays them", () => {
    expect(dayPayOf({ payType: 1, ...messy })).toEqual({ payType: 1, dailyWage: 0, commissionRate: 0 });
    expect(dayPayOf({ payType: 2, ...messy })).toEqual({ payType: 2, dailyWage: 0, commissionRate: 10 });
    expect(dayPayOf({ payType: 3, ...messy })).toEqual({ payType: 3, dailyWage: 800, commissionRate: 10 });
    expect(dayPayOf({ payType: 4, ...messy })).toEqual({ payType: 4, dailyWage: 0, commissionRate: 10 });
    expect(dayPayOf({ payType: 5, ...messy })).toEqual({ payType: 5, dailyWage: 800, commissionRate: 0 });
    expect(dayPayOf({ payType: 6, ...messy })).toEqual({ payType: 6, dailyWage: 800, commissionRate: 10 });
    expect(dayPayOf({ payType: 7, ...messy })).toEqual({ payType: 7, dailyWage: 800, commissionRate: 0 });
  });

  it("earns exactly what the whole pay earns, on any day", () => {
    for (const payType of PAY_TYPES) {
      for (const present of [true, false]) {
        const whole = { payType, ...messy };
        expect(dayEarning(dayPayOf(whole), 4350, present)).toEqual(dayEarning(whole, 4350, present));
      }
    }
  });
});

describe("which fields a pay type uses", () => {
  it("matches the spec table for types 1-3", () => {
    expect([1, 2, 3].map((t) => paysSalary(t as PayType))).toEqual([true, true, false]);
    expect([1, 2, 3].map((t) => paysDailyWage(t as PayType))).toEqual([false, false, true]);
    expect([1, 2, 3].map((t) => paysCommission(t as PayType))).toEqual([false, true, true]);
  });

  it("types 4-7 are the other mixes (P3.17)", () => {
    expect([4, 5, 6, 7].map((t) => paysSalary(t as PayType))).toEqual([false, true, true, false]);
    expect([4, 5, 6, 7].map((t) => paysDailyWage(t as PayType))).toEqual([false, true, true, true]);
    expect([4, 5, 6, 7].map((t) => paysCommission(t as PayType))).toEqual([true, false, true, false]);
  });
});

describe("pay in parts (P3.17)", () => {
  const mixes = [false, true].flatMap((salary) =>
    [false, true].flatMap((dailyWage) => [false, true].map((commission) => ({ salary, dailyWage, commission }))),
  );

  it("every mix of the three parts but none is exactly one pay type", () => {
    const types = mixes.map(payTypeOf);
    expect(types.filter((type) => type === null)).toHaveLength(1);
    expect(payTypeOf({ salary: false, dailyWage: false, commission: false })).toBeNull();
    expect(new Set(types.filter((type) => type !== null)).size).toBe(7);
  });

  it("goes from type to parts and back", () => {
    for (const type of PAY_TYPES) expect(payTypeOf(PAY_PARTS[type])).toBe(type);
  });

  it("each type has a label, and no two share one", () => {
    expect(new Set(PAY_TYPES.map((type) => PAY_TYPE_LABEL[type])).size).toBe(PAY_TYPES.length);
  });

  it("knows a pay type from anything else", () => {
    for (const type of PAY_TYPES) expect(isPayType(type)).toBe(true);
    for (const other of [0, 8, -1, 2.5, "2", null, undefined]) expect(isPayType(other)).toBe(false);
  });

  it("keeps only the fields each new type uses", () => {
    expect(normalizeStaffPay({ payType: 4, ...messy })).toEqual({ payType: 4, salary: 0, dailyWage: 0, commissionRate: 10 });
    expect(normalizeStaffPay({ payType: 5, ...messy })).toEqual({ payType: 5, salary: 40000, dailyWage: 800, commissionRate: 0 });
    expect(normalizeStaffPay({ payType: 6, ...messy })).toEqual({ payType: 6, salary: 40000, dailyWage: 800, commissionRate: 10 });
    expect(normalizeStaffPay({ payType: 7, ...messy })).toEqual({ payType: 7, salary: 0, dailyWage: 800, commissionRate: 0 });
  });

  it("a rate left on a type without commission earns nothing", () => {
    for (const payType of [1, 5, 7] as const) expect(commissionRateFor({ payType, commissionRate: 10 })).toBe(0);
    for (const payType of [2, 3, 4, 6] as const) expect(commissionRateFor({ payType, commissionRate: 10 })).toBe(10);
  });

  it("a month's salary is counted only for the types that have one", () => {
    expect(PAY_TYPES.map((payType) => monthlySalaryOf({ payType, salary: 25000 }))).toEqual([25000, 25000, 0, 0, 25000, 25000, 0]);
  });
});

describe("a day's earning on each pay (P3.17)", () => {
  const pay = (payType: PayType) => ({ payType, dailyWage: 200, commissionRate: 10 });

  it("commission only: 10% of the day's work, present or not", () => {
    expect(dayEarning(pay(4), 5000, true)).toEqual({ work: 5000, commission: 500, wage: 0, total: 500 });
    expect(dayEarning(pay(4), 5000, false).total).toBe(500);
    expect(dayEarning(pay(4), 0, true).total).toBe(0);
  });

  it("salary + daily wage: Rs 200 for a day present, whatever the work, and no commission", () => {
    expect(dayEarning(pay(5), 9000, true)).toEqual({ work: 9000, commission: 0, wage: 200, total: 200 });
    expect(dayEarning(pay(5), 0, true).total).toBe(200);
    expect(dayEarning(pay(5), 9000, false).total).toBe(0);
  });

  it("salary + daily wage + commission: both, the wage only when present", () => {
    expect(dayEarning(pay(6), 5000, true)).toEqual({ work: 5000, commission: 500, wage: 200, total: 700 });
    expect(dayEarning(pay(6), 5000, false)).toEqual({ work: 5000, commission: 500, wage: 0, total: 500 });
  });

  it("daily wage only: the wage when present, no commission", () => {
    expect(dayEarning(pay(7), 5000, true)).toEqual({ work: 5000, commission: 0, wage: 200, total: 200 });
    expect(dayEarning(pay(7), 5000, false).total).toBe(0);
  });

  it("the client's case: salary 25,000 + Rs 200 a day, present 26 days of 30 - 30,200 for the month", () => {
    const bilal = { payType: 5 as const, salary: 25000, dailyWage: 200, commissionRate: 0 };
    const days = Array.from({ length: 30 }, (_, day) => dayEarning(bilal, 3000, day < 26));
    const daily = days.reduce((sum, day) => sum + day.total, 0);
    expect(daily).toBe(5200);
    expect(daily + monthlySalaryOf(bilal)).toBe(30200);
  });

  it("salary + 10% of the day's work: the commission every night, the salary at month end", () => {
    const hamid = { payType: 2 as const, salary: 25000, dailyWage: 0, commissionRate: 10 };
    const works = [5000, 0, 3250, 4999];
    const commission = works.reduce((sum, work) => sum + dayEarning(hamid, work, true).total, 0);
    expect(commission).toBe(500 + 0 + 325 + 500);
    expect(commission + monthlySalaryOf(hamid)).toBe(26325);
  });

  it("Day close counts the daily wage in what staff earned, and in the day's profit", () => {
    const summary = summarizeDay({
      openingCash: 1000,
      bills: [{ cash: 5000, online: 0, lines: [{ staffId: "bilal", amount: 3000 }, { staffId: "ali", amount: 2000 }] }],
      entries: [],
      staff: [
        { id: "bilal", pay: pay(5), present: true },
        { id: "ali", pay: pay(4), present: false },
        { id: "absent", pay: pay(5), present: false },
      ],
      payouts: { ali: 200 },
    });
    expect(summary.earnings.bilal).toEqual({ work: 3000, commission: 0, wage: 200, total: 200 });
    expect(summary.earnings.ali).toEqual({ work: 2000, commission: 200, wage: 0, total: 200 });
    expect(summary.earnings.absent.total).toBe(0);
    expect(summary.staffEarned).toBe(400);
    expect(summary.dayProfit).toBe(5000 - 400);
    // Earning is not cash: only what was handed over leaves the drawer.
    expect(summary.expectedCash).toBe(1000 + 5000 - 200);
  });
});

describe("the monthly salary's khata label (P1.10)", () => {
  it("names the month", () => {
    expect(monthlySalaryLabel("September 2026")).toBe("Monthly salary (September 2026)");
  });

  it("is told apart from the earnings a day's close posts on the same date", () => {
    expect(isMonthlySalaryLabel(monthlySalaryLabel("September 2026"))).toBe(true);
    expect(isMonthlySalaryLabel("Commission (on work of 4000)")).toBe(false);
    expect(isMonthlySalaryLabel("Daily wage")).toBe(false);
  });
});
