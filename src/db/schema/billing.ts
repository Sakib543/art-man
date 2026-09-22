import { date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, rupees } from "./_shared";
import { customers, deals, services, staff } from "./config";

/**
 * Financial tables (append-only). Rows are never updated or deleted; a database
 * trigger enforces it. A mistake is fixed by cancelling the bill (a new
 * bill_cancellations row) plus a reversal bill, then entering a corrected bill.
 */

export const bills = pgTable(
  "bills",
  {
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
    /**
     * Set on the corrected bill of an Owner's edit (P1.4): the bill it replaces.
     * The Daily report folds the pair, and the reversal between them, into this
     * one row (P1.5). Nothing is deleted; only the everyday view is shorter.
     */
    supersedesBillId: uuid("supersedes_bill_id"),
    /** Number from the paper bill book, for bills entered after an outage. */
    bookNo: text("book_no"),
    /**
     * Money taken off this bill at the counter (P3.10). It is **not** used to
     * work out any total: the discount is shared across `bill_lines.amount`
     * when the cart is priced, because commission follows the amount actually
     * charged (spec §10.1). This column is what the receipt and the reports
     * show, and it is what makes a discount visible after the fact.
     *
     * A reversal bill carries the negative of it, so a cancelled bill and its
     * reversal add up to nothing here as they do everywhere else.
     */
    discount: rupees("discount").notNull().default(0),
    /** Why it was given. Required by the form whenever the discount is not 0. */
    discountReason: text("discount_reason"),
    createdBy: text("created_by").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // Every day screen asks for one day's bills in receipt order. Both columns
    // together, so the index answers the filter and the sort (P4.9).
    index("bills_business_date_bill_no_idx").on(t.businessDate, t.billNo),
    // The customer lookup, and the last visit it now shows (P3.8).
    index("bills_customer_id_idx").on(t.customerId),
  ],
);

export const billLines = pgTable(
  "bill_lines",
  {
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
  },
  // The most joined column in the app. Postgres does not index a foreign key
  // on its own. `staff_id` gets none: it is only ever joined TO staff.id,
  // which is the primary key doing the lookup (P4.9).
  (t) => [index("bill_lines_bill_id_idx").on(t.billId)],
);

/** A cancelled bill. Exactly one row per cancelled bill. */
export const billCancellations = pgTable("bill_cancellations", {
  billId: uuid("bill_id")
    .primaryKey()
    .references(() => bills.id),
  reason: text("reason").notNull(),
  cancelledBy: text("cancelled_by").notNull(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }).notNull().defaultNow(),
});
