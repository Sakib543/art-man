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

/** One service on the customer's last bill, with whoever performed it. */
export interface LastVisitLine {
  name: string;
  amount: Rupees;
  staffName: string;
}

/**
 * What the customer had done the last time they came in (backlog P3.8), shown
 * on the billing screen as soon as their number is looked up. A cancelled bill
 * is never the last visit.
 */
export interface LastVisit {
  billNo: number;
  businessDate: string;
  /** Summed from `lines`, so the figure always matches what is listed. */
  total: Rupees;
  lines: LastVisitLine[];
}

export interface CustomerInfo {
  /** Null when the phone number is new and the customer has not been saved yet. */
  id: string | null;
  phone: string;
  name: string;
  /** Bills that really happened: cancellations and reversals are not counted. */
  visits: number;
  /** Null for a customer whose only bills were cancelled. */
  lastVisit: LastVisit | null;
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
      /** Carried into the correction, so re-opening a discounted bill keeps it (P3.10). */
      discount: Rupees;
      discountReason: string | null;
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
  /**
   * What the lines add up to **before** the discount (P3.10). The lines
   * themselves are already net of it, so on a bill with no discount this is the
   * same as `total` and the slip shows one figure, as it always did.
   */
  subtotal: Rupees;
  discount: Rupees;
  total: Rupees;
  cash: Rupees;
  online: Rupees;
}

export type { PayMode };
