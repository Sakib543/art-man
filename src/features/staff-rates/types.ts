import type { PayType, Rupees } from "@/lib/accounting";

/** Plain rows for the Staff & rates screen. */

export interface StaffRow {
  id: string;
  name: string;
  payType: PayType;
  salary: Rupees;
  dailyWage: Rupees;
  commissionRate: number;
  active: boolean;
}

export interface ServiceRow {
  id: string;
  name: string;
  category: string;
  /** The price, or the bottom of the range when `maxPrice` is set (P3.11). */
  price: Rupees;
  /** The top of the range, or null for one fixed price. */
  maxPrice: Rupees | null;
  minutes: number | null;
  active: boolean;
}

export interface DealRow {
  id: string;
  name: string;
  price: Rupees;
  serviceIds: string[];
  active: boolean;
}
