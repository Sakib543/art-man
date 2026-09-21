import type { PayType, StaffPay } from "./types";

export const PAY_TYPES: readonly PayType[] = [1, 2, 3];

export const PAY_TYPE_LABEL: Record<PayType, string> = {
  1: "Monthly salary",
  2: "Salary + commission",
  3: "Daily wage + commission",
};

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
