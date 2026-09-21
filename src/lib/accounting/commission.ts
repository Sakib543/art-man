import type { Bill, Rupees, StaffPay } from "./types";

/** Commission % a staff member earns. Monthly-salary staff (type 1) earn none. */
export function commissionRateFor(pay: Pick<StaffPay, "payType" | "commissionRate">): number {
  return pay.payType === 1 ? 0 : pay.commissionRate;
}

/** Commission on an amount actually charged, rounded to the nearest rupee. */
export function commissionOn(amount: Rupees, ratePct: number): Rupees {
  return Math.round((amount * ratePct) / 100);
}

/**
 * Work value per staff member from a day's bills.
 * Cancelled bills and their reversal rows cancel each other out, so both are
 * counted; that is what keeps the maths honest and the mistake visible.
 */
export function workByStaff(bills: Bill[]): Record<string, Rupees> {
  const work: Record<string, Rupees> = {};
  for (const bill of bills) {
    for (const line of bill.lines) {
      work[line.staffId] = (work[line.staffId] ?? 0) + line.amount;
    }
  }
  return work;
}

export interface DayEarning {
  work: Rupees;
  commission: Rupees;
  wage: Rupees;
  total: Rupees;
}

/**
 * What a staff member earned for one day.
 *  Type 1: nothing daily (salary is added at month end).
 *  Type 2: commission only (salary at month end).
 *  Type 3: daily wage (only if present) + commission.
 */
export function dayEarning(pay: StaffPay, work: Rupees, present: boolean): DayEarning {
  const commission = commissionOn(work, commissionRateFor(pay));
  const wage = pay.payType === 3 && present ? pay.dailyWage : 0;
  return { work, commission, wage, total: commission + wage };
}
