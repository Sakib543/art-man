import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, rupees } from "./_shared";
import { monthlyExpenseKindEnum } from "./enums";
import { partners } from "./config";

/** Owner-only monthly accounts. Append-only. `month` is the first day, e.g. 2026-09-01. */
export const monthlyExpenses = pgTable("monthly_expenses", {
  id: id(),
  month: date("month", { mode: "string" }).notNull(),
  kind: monthlyExpenseKindEnum("kind").notNull(),
  label: text("label").notNull(),
  amount: rupees("amount").notNull(),
  /** Required for "other" expenses. */
  reason: text("reason"),
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
  createdAt: createdAt(),
});

/** Once a month is closed it is frozen. Corrections go in next month as adjustments. */
export const monthCloses = pgTable("month_closes", {
  month: date("month", { mode: "string" }).primaryKey(),
  closedBy: text("closed_by").notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }).notNull().defaultNow(),
});
