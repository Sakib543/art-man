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

/**
 * Which parts a staff member's pay is made of (`PAY_PARTS`): 1 = monthly
 * salary only, 2 = salary + commission, 3 = daily wage + commission,
 * 4 = commission only, 5 = salary + daily wage, 6 = salary + daily wage +
 * commission, 7 = daily wage only (4–7 since P3.17).
 */
export type PayType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface StaffPay {
  payType: PayType;
  /** Monthly salary. Used by the pay types with a salary (`paysSalary`). */
  salary: Rupees;
  /** Wage per present day. Used by the pay types with a daily wage (`paysDailyWage`). */
  dailyWage: Rupees;
  /** Commission percent, e.g. 10 means 10%. Used by the pay types with commission (`paysCommission`). */
  commissionRate: number;
}

/**
 * What one day's earnings are worked out from (`dayEarning`): a salary is
 * added at month end, so no day needs it. It is all of a staff member's pay
 * that Day close — online, or offline from the day's copy — is given (P7.13).
 */
export type DayPay = Pick<StaffPay, "payType" | "dailyWage" | "commissionRate">;

/** One line of a bill: what was actually charged, and who did the work. */
export interface BillLine {
  staffId: string;
  /** Amount actually charged for this line (special rate / deal share), not list price. */
  amount: Rupees;
}

export interface Bill {
  lines: BillLine[];
  cash: Rupees;
  online: Rupees;
}

export type KhataKind = "earning" | "payment" | "advance" | "bonus" | "adjustment" | "overtime" | "deduction";

export interface Partner {
  id: string;
  /** Profit share percent. All partners together must sum to 100. */
  sharePct: number;
}
