import type { PartnerAccount, Rupees } from "@/lib/accounting";

export interface PartnerRow {
  id: string;
  name: string;
  sharePct: number;
}

export interface AccountRow extends PartnerAccount {
  partnerId: string;
  name: string;
  sharePct: number;
}

export interface DrawingRow {
  id: string;
  createdAt: string;
  note: string | null;
  /** Negative on a cancellation row. */
  amount: Rupees;
  voided: boolean;
  isVoid: boolean;
}

export interface CapitalLine {
  name: string;
  putIn: Rupees;
  repaid: Rupees;
  owedBack: Rupees;
}

export interface PartnersData {
  month: string;
  monthLabel: string;
  /** A closed month shows the shares as they were when it closed. */
  closed: boolean;
  months: { month: string; label: string; closed: boolean }[];
  netProfit: Rupees;
  /** The current partners and their share %, for editing. */
  partners: PartnerRow[];
  accounts: AccountRow[];
  selected: { partner: PartnerRow; account: AccountRow; capital: CapitalLine[]; drawings: DrawingRow[] } | null;
}
