import type { Rupees } from "@/lib/accounting";

/** One line of the customer list. */
export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  /** How many services this customer has a fixed price for. */
  rates: number;
}

/** A service, with this customer's fixed price when there is one. */
export interface RateRow {
  serviceId: string;
  serviceName: string;
  listPrice: Rupees;
  /** Null when the customer pays the list price. */
  price: Rupees | null;
}

export interface CustomerDetail {
  id: string;
  name: string;
  phone: string;
  /** Every active service, whether or not it has a special rate. */
  rates: RateRow[];
}

export interface CustomersData {
  list: CustomerRow[];
  selected: CustomerDetail | null;
  /** What was searched for, so the box keeps it. */
  query: string;
  /** True when the list was cut short, so the screen can say so. */
  more: boolean;
}
