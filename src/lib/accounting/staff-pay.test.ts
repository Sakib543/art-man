import { describe, expect, it } from "vitest";
import {
  dayEarning,
  dayPayOf,
  isMonthlySalaryLabel,
  monthlySalaryLabel,
  normalizeStaffPay,
  paysCommission,
  paysDailyWage,
  paysSalary,
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
    for (const payType of [1, 2, 3] as const) {
      expect(dayPayOf({ payType, ...messy })).not.toHaveProperty("salary");
    }
  });

  it("keeps the wage and the rate only where the pay type pays them", () => {
    expect(dayPayOf({ payType: 1, ...messy })).toEqual({ payType: 1, dailyWage: 0, commissionRate: 0 });
    expect(dayPayOf({ payType: 2, ...messy })).toEqual({ payType: 2, dailyWage: 0, commissionRate: 10 });
    expect(dayPayOf({ payType: 3, ...messy })).toEqual({ payType: 3, dailyWage: 800, commissionRate: 10 });
  });

  it("earns exactly what the whole pay earns, on any day", () => {
    for (const payType of [1, 2, 3] as const) {
      for (const present of [true, false]) {
        const whole = { payType, ...messy };
        expect(dayEarning(dayPayOf(whole), 4350, present)).toEqual(dayEarning(whole, 4350, present));
      }
    }
  });
});

describe("which fields a pay type uses", () => {
  it("matches the spec table", () => {
    expect([1, 2, 3].map((t) => paysSalary(t as 1 | 2 | 3))).toEqual([true, true, false]);
    expect([1, 2, 3].map((t) => paysDailyWage(t as 1 | 2 | 3))).toEqual([false, false, true]);
    expect([1, 2, 3].map((t) => paysCommission(t as 1 | 2 | 3))).toEqual([false, true, true]);
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
