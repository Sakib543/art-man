import { describe, expect, it } from "vitest";
import { normalizeStaffPay, paysCommission, paysDailyWage, paysSalary } from "./index";

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

describe("which fields a pay type uses", () => {
  it("matches the spec table", () => {
    expect([1, 2, 3].map((t) => paysSalary(t as 1 | 2 | 3))).toEqual([true, true, false]);
    expect([1, 2, 3].map((t) => paysDailyWage(t as 1 | 2 | 3))).toEqual([false, false, true]);
    expect([1, 2, 3].map((t) => paysCommission(t as 1 | 2 | 3))).toEqual([false, true, true]);
  });
});
