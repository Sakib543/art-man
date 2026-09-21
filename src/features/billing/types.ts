import type { PayMode, Rupees } from "@/lib/accounting";

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
