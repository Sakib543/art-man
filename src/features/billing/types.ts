import type { PayMode, Rupees } from "@/lib/accounting";
import type { CartLine } from "./cart-state";

/** Plain data passed from the server to the billing screen (safe to serialise). */

export interface CatalogService {
  id: string;
  name: string;
  category: string;
  price: Rupees;
  minutes: number | null;
}

export interface CatalogDeal {
  id: string;
  name: string;
  price: Rupees;
  serviceIds: string[];
}

export interface StaffOption {
  id: string;
  name: string;
}

export interface BillingData {
  businessDate: string;
  nextBillNo: number;
  services: CatalogService[];
  deals: CatalogDeal[];
  staff: StaffOption[];
}

export interface CustomerInfo {
  /** Null when the phone number is new and the customer has not been saved yet. */
  id: string | null;
  phone: string;
  name: string;
  visits: number;
  lastVisit: string | null;
  specialRates: Record<string, Rupees>;
}

/**
 * A saved bill re-opened for correction (P1.4). `ok: false` carries the reason
 * the screen shows instead, e.g. the bill is already cancelled.
 */
export type BillDraft =
  | {
      ok: true;
      id: string;
      billNo: number;
      lines: CartLine[];
      customer: CustomerInfo | null;
      cash: Rupees;
      online: Rupees;
      bookNo: string | null;
    }
  | { ok: false; reason: string };

export interface ReceiptLine {
  name: string;
  amount: Rupees;
  staffName: string;
  note: string | null;
}

export interface Receipt {
  billNo: number;
  createdAt: string;
  businessDate: string;
  customerName: string | null;
  lines: ReceiptLine[];
  total: Rupees;
  cash: Rupees;
  online: Rupees;
}

export type { PayMode };
