import { AnyPgColumn, boolean, date, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, rupees } from "./_shared";
import { khataEntries } from "./cash";
import { monthAdjustmentKindEnum, monthlyExpenseKindEnum, paidFromEnum } from "./enums";
import { partners, staff } from "./config";

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

/**
 * Profit a partner took out during a month. A money entry: append-only.
 * A mistake is cancelled with a negative row that points back at it.
 */
export const partnerDrawings = pgTable("partner_drawings", {
  id: id(),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id),
  /** First day of the month it belongs to, e.g. 2026-09-01. */
  month: date("month", { mode: "string" }).notNull(),
  amount: rupees("amount").notNull(),
  note: text("note"),
  voidsId: uuid("voids_id").references((): AnyPgColumn => partnerDrawings.id),
  createdBy: text("created_by").notNull().default("system"),
  createdAt: createdAt(),
});

/**
 * Once a month is closed it is frozen. Corrections go in next month as
 * adjustments. The report and the partners' shares are saved here at that
 * moment, so a later change to a staff salary or a share % cannot alter them.
 */
export const monthCloses = pgTable("month_closes", {
  month: date("month", { mode: "string" }).primaryKey(),
  closedBy: text("closed_by").notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }).notNull().defaultNow(),
  /** The month's report as it was when closed. */
  report: jsonb("report"),
  /** Each partner's share % and rupee share as it was when closed. */
  shares: jsonb("shares"),
});

/**
 * A correction to a month that is already closed (backlog P3.4, spec §7.4).
 * The closed month is never touched: its report and the partners' shares were
 * saved when it closed, and may already have been paid out. The correction
 * counts in `month` instead — the month that was open when it was recorded —
 * in its profit, and so in its partners' shares, and in a staff member's khata
 * when it is about their pay.
 *
 * Append-only. A mistake is cancelled with a row of the opposite sign that
 * points back at it, and only while `month` is open. Few rows a month, so no
 * index, like `monthly_expenses`.
 */
export const monthAdjustments = pgTable("month_adjustments", {
  id: id(),
  /** First day of the month it counts in, e.g. 2026-10-01. */
  month: date("month", { mode: "string" }).notNull(),
  /** First day of the closed month it corrects, e.g. 2026-09-01. */
  correctsMonth: date("corrects_month", { mode: "string" }).notNull(),
  kind: monthAdjustmentKindEnum("kind").notNull(),
  /**
   * How the closed month's figure should have read: + more than recorded,
   * - less. What that does to the profit and the khata is `adjustmentEffect`.
   */
  amount: rupees("amount").notNull(),
  /** A sale only: was it paid online, into the Owner's bank? */
  online: boolean("online"),
  /** An expense only: did the business pay it, or the Owner himself? */
  paidFrom: paidFromEnum("paid_from"),
  /** A staff member's pay only: whose. */
  staffId: uuid("staff_id").references(() => staff.id),
  /** A staff member's pay only: the khata line written with it. */
  khataEntryId: uuid("khata_entry_id").references(() => khataEntries.id),
  reason: text("reason").notNull(),
  /**
   * Set on a cancellation row: the adjustment it cancels. Unique, so the same
   * adjustment cannot be cancelled twice, even by two requests at once.
   */
  voidsId: uuid("voids_id")
    .unique()
    .references((): AnyPgColumn => monthAdjustments.id),
  createdBy: text("created_by").notNull(),
  createdAt: createdAt(),
});
