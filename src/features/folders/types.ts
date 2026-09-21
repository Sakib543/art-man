import type { FolderKind, FolderTotals, PaidFrom, Rupees } from "@/lib/accounting";

export interface EntryRow {
  id: string;
  createdAt: string;
  kind: FolderKind;
  /** Negative on a cancellation row. */
  amount: Rupees;
  description: string | null;
  paidFrom: PaidFrom | null;
  staffName: string | null;
  pinConfirmed: boolean;
  /** This row cancels an earlier entry. */
  isVoid: boolean;
  /** A later row has cancelled this entry. */
  voided: boolean;
}

export interface OnlineRow {
  billNo: number;
  createdAt: string;
  customerName: string | null;
  amount: Rupees;
}

export interface StaffOption {
  id: string;
  name: string;
}

export interface FoldersData {
  businessDate: string;
  entries: EntryRow[];
  online: OnlineRow[];
  staff: StaffOption[];
  totals: FolderTotals;
}
