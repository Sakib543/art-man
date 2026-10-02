import { paysCommission, paysDailyWage } from "./staff-pay";
import type { Bill, DayPay, Rupees, StaffPay } from "./types";

/** Commission % a staff member earns: none unless their pay type has commission. */
export function commissionRateFor(pay: Pick<StaffPay, "payType" | "commissionRate">): number {
  return paysCommission(pay.payType) ? pay.commissionRate : 0;
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
 * What a staff member earned for one day: commission on the day's work if
 * their pay type has commission, plus the daily wage if it has one and they
 * were present. A salary is never earned by a day; Month close adds it.
 */
export function dayEarning(pay: DayPay, work: Rupees, present: boolean): DayEarning {
  const commission = commissionOn(work, commissionRateFor(pay));
  const wage = paysDailyWage(pay.payType) && present ? pay.dailyWage : 0;
  return { work, commission, wage, total: commission + wage };
}
