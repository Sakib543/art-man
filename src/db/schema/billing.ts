import { date, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, rupees } from "./_shared";
import { customers, deals, services, staff } from "./config";

/**
 * Financial tables (append-only). Rows are never updated or deleted; a database
 * trigger enforces it. A mistake is fixed by cancelling the bill (a new
 * bill_cancellations row) plus a reversal bill, then entering a corrected bill.
 */

export const bills = pgTable("bills", {
  id: id(),
  /** Human-friendly running number printed on the receipt. */
  billNo: integer("bill_no").notNull().unique().generatedAlwaysAsIdentity(),
  /** The business day this bill belongs to (not the clock date). */
  businessDate: date("business_date", { mode: "string" }).notNull(),
  customerId: uuid("customer_id").references(() => customers.id),
  cash: rupees("cash").notNull().default(0),
  online: rupees("online").notNull().default(0),
  /** Set on a reversal bill: the bill it cancels out. */
  reversesBillId: uuid("reverses_bill_id"),
  /** Number from the paper bill book, for bills entered after an outage. */
  bookNo: text("book_no"),
  createdBy: text("created_by").notNull(),
  createdAt: createdAt(),
});

export const billLines = pgTable("bill_lines", {
  id: id(),
  billId: uuid("bill_id")
    .notNull()
    .references(() => bills.id),
  serviceId: uuid("service_id").references(() => services.id),
  dealId: uuid("deal_id").references(() => deals.id),
  /** Name at the time of billing, so later renames do not change history. */
  name: text("name").notNull(),
  /** Amount actually charged (special rate / deal share). Commission is based on this. */
  amount: rupees("amount").notNull(),
  staffId: uuid("staff_id")
    .notNull()
    .references(() => staff.id),
});

/** A cancelled bill. Exactly one row per cancelled bill. */
export const billCancellations = pgTable("bill_cancellations", {
  billId: uuid("bill_id")
    .primaryKey()
    .references(() => bills.id),
  reason: text("reason").notNull(),
  cancelledBy: text("cancelled_by").notNull(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }).notNull().defaultNow(),
});
