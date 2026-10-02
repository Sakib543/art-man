import { describe, expect, it } from "vitest";
import { staffSchema } from "./schemas";

const staff = (pay: { payType: number; salary?: number; dailyWage?: number; commissionRate?: number }) => ({
  name: "Bilal",
  salary: 0,
  dailyWage: 0,
  commissionRate: 0,
  active: true,
  ...pay,
});

const problem = (input: unknown) => {
  const parsed = staffSchema.safeParse(input);
  return parsed.success ? null : parsed.error.issues[0]?.message;
};

describe("staffSchema: pay in parts (P3.17)", () => {
  it("takes each of the seven pay types with its parts filled in", () => {
    expect(problem(staff({ payType: 1, salary: 25000 }))).toBeNull();
    expect(problem(staff({ payType: 2, salary: 25000, commissionRate: 10 }))).toBeNull();
    expect(problem(staff({ payType: 3, dailyWage: 800, commissionRate: 10 }))).toBeNull();
    expect(problem(staff({ payType: 4, commissionRate: 10 }))).toBeNull();
    expect(problem(staff({ payType: 5, salary: 25000, dailyWage: 200 }))).toBeNull();
    expect(problem(staff({ payType: 6, salary: 25000, dailyWage: 200, commissionRate: 10 }))).toBeNull();
    expect(problem(staff({ payType: 7, dailyWage: 800 }))).toBeNull();
  });

  it("refuses a pay type that does not exist", () => {
    for (const payType of [0, 8, 2.5]) expect(problem(staff({ payType, salary: 1, dailyWage: 1, commissionRate: 1 }))).toBe("Choose how this person is paid");
  });

  it("refuses a chosen part left at 0", () => {
    expect(problem(staff({ payType: 5, salary: 25000 }))).toBe("Enter the daily wage");
    expect(problem(staff({ payType: 5, dailyWage: 200 }))).toBe("Enter the monthly salary");
    expect(problem(staff({ payType: 4 }))).toBe("Enter the commission %");
    expect(problem(staff({ payType: 3, dailyWage: 800 }))).toBe("Enter the commission %");
  });

  it("does not ask for a part the pay type does not have", () => {
    expect(problem(staff({ payType: 7, dailyWage: 800, salary: 0, commissionRate: 0 }))).toBeNull();
  });

  it("keeps a commission to two decimals, as the column does", () => {
    expect(problem(staff({ payType: 4, commissionRate: 12.5 }))).toBeNull();
    expect(problem(staff({ payType: 4, commissionRate: 12.25 }))).toBeNull();
    expect(problem(staff({ payType: 4, commissionRate: 12.345 }))).toBe("Use at most two decimals in the commission, e.g. 12.5");
  });

  it("still refuses a fraction of a rupee and a commission over 100%", () => {
    expect(problem(staff({ payType: 5, salary: 25000, dailyWage: 200.5 }))).toBe("Use whole rupees");
    expect(problem(staff({ payType: 4, commissionRate: 101 }))).toBe("Commission cannot be more than 100%");
  });
});
