import { boolean, date, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, rupees } from "./_shared";
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
 * Append-only; the security code lets the owner detect later tampering.
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
