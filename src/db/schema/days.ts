import { boolean, date, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, rupees } from "./_shared";
import { staff } from "./config";

/** One row per business day. A new day cannot start until the previous one is closed. */
export const businessDays = pgTable("business_days", {
  businessDate: date("business_date", { mode: "string" }).primaryKey(),
  /** Cash left in the drawer from yesterday. The owner enters it for the first day only. */
  openingCash: rupees("opening_cash").notNull(),
  openedAt: createdAt(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

/** Daily-wage staff attendance, marked at Day Close. */
export const attendance = pgTable(
  "attendance",
  {
    businessDate: date("business_date", { mode: "string" })
      .notNull()
      .references(() => businessDays.businessDate),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id),
    present: boolean("present").notNull(),
  },
  (t) => [primaryKey({ columns: [t.businessDate, t.staffId] })],
);

/**
 * Created at Day Close. Derived from the entries, never the source of truth.
 * It can never be edited. It is removed only when the Owner reopens the day,
 * and the removed row is copied into `day_snapshot_history` first, so the old
 * figures and security code are never lost.
 */
export const daySnapshots = pgTable("day_snapshots", {
  businessDate: date("business_date", { mode: "string" })
    .primaryKey()
    .references(() => businessDays.businessDate),
  sale: rupees("sale").notNull(),
  cash: rupees("cash").notNull(),
  online: rupees("online").notNull(),
  expenses: rupees("expenses").notNull(),
  staffEarned: rupees("staff_earned").notNull(),
  staffPaid: rupees("staff_paid").notNull(),
  dayProfit: rupees("day_profit").notNull(),
  openingCash: rupees("opening_cash").notNull(),
  expectedCash: rupees("expected_cash").notNull(),
  countedCash: rupees("counted_cash").notNull(),
  difference: rupees("difference").notNull(),
  diffReason: text("diff_reason"),
  /** Hash over this day's figures plus the previous day's code. */
  securityCode: text("security_code").notNull(),
  closedBy: text("closed_by").notNull(),
  createdAt: createdAt(),
});

/**
 * Every superseded closing record. When the Owner reopens a closed day, that
 * day's snapshot is copied here before it is replaced, together with the reason
 * and who did it. Append-only: a reopened day's original figures and security
 * code stay on the record for good, so a reopen can never quietly hide anything.
 */
export const daySnapshotHistory = pgTable("day_snapshot_history", {
  id: id(),
  businessDate: date("business_date", { mode: "string" }).notNull(),
  sale: rupees("sale").notNull(),
  cash: rupees("cash").notNull(),
  online: rupees("online").notNull(),
  expenses: rupees("expenses").notNull(),
  staffEarned: rupees("staff_earned").notNull(),
  staffPaid: rupees("staff_paid").notNull(),
  dayProfit: rupees("day_profit").notNull(),
  openingCash: rupees("opening_cash").notNull(),
  expectedCash: rupees("expected_cash").notNull(),
  countedCash: rupees("counted_cash").notNull(),
  difference: rupees("difference").notNull(),
  diffReason: text("diff_reason"),
  securityCode: text("security_code").notNull(),
  closedBy: text("closed_by").notNull(),
  /** When the day was originally closed. */
  closedAt: timestamp("closed_at", { withTimezone: true }).notNull(),
  reopenReason: text("reopen_reason").notNull(),
  reopenedBy: text("reopened_by").notNull(),
  reopenedAt: timestamp("reopened_at", { withTimezone: true }).notNull().defaultNow(),
});
