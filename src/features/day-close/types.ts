import type { BreakdownRow, PayType, Rupees } from "@/lib/accounting";

/** Plain data passed from the server to the Day Close screen. */

export interface CloseStaffRow {
  id: string;
  name: string;
  payType: PayType;
  salary: Rupees;
  dailyWage: Rupees;
  commissionRate: number;
  /** Value of the work billed today, net of cancelled bills. */
  work: Rupees;
  /** Running khata balance before today's earnings and payments are added. */
  khataBalance: Rupees;
}

export interface SnapshotRow {
  businessDate: string;
  sale: Rupees;
  cash: Rupees;
  online: Rupees;
  expenses: Rupees;
  staffEarned: Rupees;
  staffPaid: Rupees;
  dayProfit: Rupees;
  openingCash: Rupees;
  expectedCash: Rupees;
  countedCash: Rupees;
  difference: Rupees;
  diffReason: string | null;
  securityCode: string;
  closedBy: string;
  closedAt: string;
  cancelledBills: number;
}

export type DayCloseData =
  | { state: "no-day" }
  | { state: "open"; businessDate: string; openingCash: Rupees; staff: CloseStaffRow[] }
  | { state: "closed"; snapshot: SnapshotRow };

/** Shown after the count, never before, so the count stays honest. */
export interface CloseReview {
  expected: Rupees;
  counted: Rupees;
  /** Counted minus expected. Negative = short. */
  difference: Rupees;
  breakdown: BreakdownRow[];
  onlineSales: Rupees;
}
