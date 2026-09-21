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
]);

export const monthlyExpenseKindEnum = pgEnum("monthly_expense_kind", ["fixed", "other"]);
