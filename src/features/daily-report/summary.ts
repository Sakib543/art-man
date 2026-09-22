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
  /** Paid bills that replaced an earlier version of themselves (P1.5). */
  editedBills: number;
}

/**
 * Feed this the folded rows (`foldCorrections`), not the raw ones. A correction's
 * cancelled bill and its reversal add up to zero, so the money comes out the
 * same either way — but the counts only read correctly once a corrected bill
 * is one row rather than three.
 */
export function summarizeBills(bills: (DayBill & { previous?: DayBill[] })[]): ReportSummary {
  let cash = 0;
  let online = 0;
  let paidBills = 0;
  let cancelledBills = 0;
  let editedBills = 0;

  for (const bill of bills) {
    cash += bill.cash;
    online += bill.online;
    if (bill.status === "active") paidBills += 1;
    if (bill.status === "cancelled") cancelledBills += 1;
    if (bill.previous?.length) editedBills += 1;
  }
  return { total: cash + online, cash, online, paidBills, cancelledBills, editedBills };
}
