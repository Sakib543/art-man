import { pgEnum } from "drizzle-orm/pg-core";

export const paidFromEnum = pgEnum("paid_from", ["drawer", "owner"]);

/** The daily folders. Online money lives on bills and never enters the drawer. */
export const cashEntryKindEnum = pgEnum("cash_entry_kind", [
  "expense",
  "staff_advance",
  "staff_payment",
  "owner_took",
  "owner_added",
]);

export const khataKindEnum = pgEnum("khata_kind", [
  "earning",
  "payment",
  "advance",
  "bonus",
  "adjustment",
  // P3.18: hours of overtime at the karigar's rate, and an amount taken off
  // for a reason; a cancelled one is a line of the same kind, sign turned.
  "overtime",
  "deduction",
]);

export const monthlyExpenseKindEnum = pgEnum("monthly_expense_kind", ["fixed", "other"]);

/**
 * What an adjustment for a closed month puts right (backlog P3.4): a sale, an
 * expense, what a staff member earned, or what a staff member took.
 */
export const monthAdjustmentKindEnum = pgEnum("month_adjustment_kind", ["sale", "expense", "staff_earning", "staff_taken"]);
