import { AnyPgColumn, boolean, date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, rupees } from "./_shared";
import { monthlyExpenseKindEnum, paidFromEnum } from "./enums";
import { partners } from "./config";

/**
 * The recurring monthly bills the Owner tracks (rent, electricity...). This is
 * configuration: lines can be added and deactivated. The amounts themselves
 * are entries in `monthly_expenses`.
 */
export const fixedExpenseLines = pgTable("fixed_expense_lines", {
  id: id(),
  name: text("name").notNull(),
  /** The Owner pays this from his own account, not from the business cash. */
  paidByOwner: boolean("paid_by_owner").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

/**
 * Owner-only monthly expenses. Append-only. `month` is the first day, e.g.
 * 2026-09-01. Changing a fixed amount adds a row for the difference; cancelling
 * an entry adds a row with the negative amount that points back at it.
 */
export const monthlyExpenses = pgTable("monthly_expenses", {
  id: id(),
  month: date("month", { mode: "string" }).notNull(),
  kind: monthlyExpenseKindEnum("kind").notNull(),
  label: text("label").notNull(),
  amount: rupees("amount").notNull(),
  /** Required for "other" expenses; also the reason on a correction or cancellation. */
  reason: text("reason"),
  /** Did the money leave the business, or did the Owner pay it himself? */
  paidFrom: paidFromEnum("paid_from").notNull().default("drawer"),
  /** Set on a cancellation row: the entry it cancels. */
  voidsId: uuid("voids_id").references((): AnyPgColumn => monthlyExpenses.id),
  createdBy: text("created_by").notNull().default("system"),
  createdAt: createdAt(),
});

/** Partner-funded investment (e.g. solar). Capital, not an expense. */
export const capitalItems = pgTable("capital_items", {
  id: id(),
  name: text("name").notNull(),
  totalCost: rupees("total_cost").notNull(),
  createdAt: createdAt(),
});

export const capitalContributions = pgTable("capital_contributions", {
  id: id(),
  capitalItemId: uuid("capital_item_id")
    .notNull()
    .references(() => capitalItems.id),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id),
  amount: rupees("amount").notNull(),
});

export const capitalRepayments = pgTable("capital_repayments", {
  id: id(),
  capitalItemId: uuid("capital_item_id")
    .notNull()
    .references(() => capitalItems.id),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id),
  amount: rupees("amount").notNull(),
  paidOn: date("paid_on", { mode: "string" }).notNull(),
  note: text("note"),
  createdBy: text("created_by").notNull().default("system"),
  createdAt: createdAt(),
});

/** Once a month is closed it is frozen. Corrections go in next month as adjustments. */
export const monthCloses = pgTable("month_closes", {
  month: date("month", { mode: "string" }).primaryKey(),
  closedBy: text("closed_by").notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }).notNull().defaultNow(),
});
