/**
 * Shared types for the accounting module.
 *
 * Money is always an integer number of whole rupees (PKR). Never a float.
 * Anything that would produce a fraction (commission, deal split, partner
 * share) is rounded here, in one place, so every screen agrees.
 */

/** Whole rupees as an integer. Negative values are allowed (reversals, advances). */
export type Rupees = number;

/** ISO date string, e.g. "2026-09-11". This is the *business* date, not the clock date. */
export type BusinessDate = string;

/** 1 = monthly salary only, 2 = salary + commission, 3 = daily wage + commission. */
export type PayType = 1 | 2 | 3;

export interface StaffPay {
  payType: PayType;
  /** Monthly salary. Used by pay types 1 and 2. */
  salary: Rupees;
  /** Wage per present day. Used by pay type 3. */
  dailyWage: Rupees;
  /** Commission percent, e.g. 10 means 10%. Ignored for pay type 1. */
  commissionRate: number;
}

/** One line of a bill: what was actually charged, and who did the work. */
export interface BillLine {
  staffId: string;
  /** Amount actually charged for this line (special rate / deal share), not list price. */
  amount: Rupees;
}

export type BillStatus = "active" | "cancelled" | "reversal";

export interface Bill {
  status: BillStatus;
  lines: BillLine[];
  cash: Rupees;
  online: Rupees;
}

export type KhataKind = "earning" | "payment" | "advance" | "bonus" | "adjustment";

/** One line of a staff member's running ledger. Positive = owed to staff, negative = taken. */
export interface KhataEntry {
  kind: KhataKind;
  amount: Rupees;
}

export interface Partner {
  id: string;
  /** Profit share percent. All partners together must sum to 100. */
  sharePct: number;
}
