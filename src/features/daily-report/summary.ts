import type { DayBill } from "@/db/queries/day-bills";
import type { Rupees } from "@/lib/accounting";

export interface ReportSummary {
  /** Net of cancelled bills and their reversals, so it matches the Day Close sale. */
  total: Rupees;
  cash: Rupees;
  online: Rupees;
  /** Bills that were paid and not cancelled. */
  paidBills: number;
  cancelledBills: number;
}

export function summarizeBills(bills: DayBill[]): ReportSummary {
  let cash = 0;
  let online = 0;
  let paidBills = 0;
  let cancelledBills = 0;

  for (const bill of bills) {
    cash += bill.cash;
    online += bill.online;
    if (bill.status === "active") paidBills += 1;
    if (bill.status === "cancelled") cancelledBills += 1;
  }
  return { total: cash + online, cash, online, paidBills, cancelledBills };
}
