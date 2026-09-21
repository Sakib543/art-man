import type { Rupees } from "@/lib/accounting";

export interface PartnerOption {
  id: string;
  name: string;
}

export interface FunderRow {
  partnerId: string;
  partnerName: string;
  contributed: Rupees;
  repaid: Rupees;
  remaining: Rupees;
}

export interface RepaymentRow {
  id: string;
  paidOn: string;
  partnerName: string;
  note: string | null;
  amount: Rupees;
}

export interface InvestmentRow {
  id: string;
  name: string;
  addedOn: string;
  total: Rupees;
  paid: Rupees;
  remaining: Rupees;
  funders: FunderRow[];
  repayments: RepaymentRow[];
}

export interface CapitalData {
  partners: PartnerOption[];
  investments: InvestmentRow[];
  totals: { invested: Rupees; paid: Rupees; outstanding: Rupees };
}
