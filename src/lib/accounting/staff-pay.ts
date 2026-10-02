import type { DayPay, PayType, StaffPay } from "./types";

export const PAY_TYPES: readonly PayType[] = [1, 2, 3];

export const PAY_TYPE_LABEL: Record<PayType, string> = {
  1: "Monthly salary",
  2: "Salary + commission",
  3: "Daily wage + commission",
};

/**
 * The khata label Month close gives a monthly salary, e.g. "Monthly salary
 * (September 2026)". It is dated on the month's last business day, beside that
 * day's own commission and wage, so settling that day again must be able to
 * tell it from them: no bill moves a salary (backlog P1.10).
 */
export const monthlySalaryLabel = (monthName: string): string => `Monthly salary (${monthName})`;
export const isMonthlySalaryLabel = (label: string): boolean => label.startsWith("Monthly salary");

export const paysSalary = (type: PayType): boolean => type === 1 || type === 2;
export const paysDailyWage = (type: PayType): boolean => type === 3;
export const paysCommission = (type: PayType): boolean => type === 2 || type === 3;

/** Zero out the fields a pay type does not use, so stale values never leak into pay. */
export function normalizeStaffPay(pay: StaffPay): StaffPay {
  return {
    payType: pay.payType,
    salary: paysSalary(pay.payType) ? pay.salary : 0,
    dailyWage: paysDailyWage(pay.payType) ? pay.dailyWage : 0,
    commissionRate: paysCommission(pay.payType) ? pay.commissionRate : 0,
  };
}

/**
 * The part of a staff member's pay a day's close works with (P7.13, QA-08):
 * the pay type, and the wage and commission rate only where the type pays
 * them. Never the salary, even when handed a whole `StaffPay`: this is what
 * reaches the browser for Day close.
 */
export function dayPayOf(pay: DayPay): DayPay {
  return {
    payType: pay.payType,
    dailyWage: paysDailyWage(pay.payType) ? pay.dailyWage : 0,
    commissionRate: paysCommission(pay.payType) ? pay.commissionRate : 0,
  };
}
