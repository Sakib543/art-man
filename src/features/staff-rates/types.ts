import type { PayType, Rupees } from "@/lib/accounting";

/** Plain rows for the Staff & rates screen. Never includes a PIN hash. */

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
  price: Rupees;
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
