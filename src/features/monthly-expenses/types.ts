import type { PaidFrom, Rupees } from "@/lib/accounting";

export interface MonthOption {
  month: string;
  label: string;
  closed: boolean;
}

export interface FixedLineRow {
  id: string;
  name: string;
  paidByOwner: boolean;
  active: boolean;
  /** This month's amount: the sum of its entries. */
  amount: Rupees;
}

export interface OtherRow {
  id: string;
  createdAt: string;
  reason: string;
  /** Negative on a cancellation row. */
  amount: Rupees;
  paidFrom: PaidFrom;
  /** A later row has cancelled this entry. */
  voided: boolean;
  /** This row cancels an earlier entry. */
  isVoid: boolean;
}

export interface ExpensesData {
  month: string;
  monthLabel: string;
  /** A closed month is frozen: nothing can be added or changed. */
  closed: boolean;
  months: MonthOption[];
  fixed: FixedLineRow[];
  others: OtherRow[];
  totals: { fixed: Rupees; others: Rupees; total: Rupees };
}
