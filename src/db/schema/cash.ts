import { AnyPgColumn, boolean, date, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, rupees } from "./_shared";
import { cashEntryKindEnum, khataKindEnum, paidFromEnum } from "./enums";
import { staff } from "./config";

/** Daily folders: expenses, staff money, owner cash. Append-only, like bills. */
export const cashEntries = pgTable(
  "cash_entries",
  {
    id: id(),
    businessDate: date("business_date", { mode: "string" }).notNull(),
    kind: cashEntryKindEnum("kind").notNull(),
    amount: rupees("amount").notNull(),
    description: text("description"),
    /** Expenses only: did the money leave the drawer, or did the owner pay it himself? */
    paidFrom: paidFromEnum("paid_from"),
    /** Staff advances and payments only. */
    staffId: uuid("staff_id").references(() => staff.id),
    /**
     * True once the owner confirmed with their PIN. Only owner cash movements ask
     * for one: staff PINs were removed, so staff advances and payments are recorded
     * on the manager's word alone.
     */
    pinConfirmed: boolean("pin_confirmed").notNull().default(false),
    /** Set on a reversal row: the entry it voids. */
    voidsEntryId: uuid("voids_entry_id"),
    createdBy: text("created_by").notNull(),
    createdAt: createdAt(),
  },
  // A day's folder entries, in the order they were entered — which is the
  // order the security code hashes them in, so it must not be a sort of an
  // unordered scan (P4.9).
  (t) => [index("cash_entries_business_date_created_at_idx").on(t.businessDate, t.createdAt)],
);

/** Running staff ledger. Positive = owed to staff, negative = taken. Append-only. */
export const khataEntries = pgTable(
  "khata_entries",
  {
    id: id(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id),
    businessDate: date("business_date", { mode: "string" }).notNull(),
    kind: khataKindEnum("kind").notNull(),
    label: text("label").notNull(),
    amount: rupees("amount").notNull(),
    billId: uuid("bill_id"),
    cashEntryId: uuid("cash_entry_id").references(() => cashEntries.id),
    /** Set on a reversal row: the khata line it cancels out (used when a day is reopened). */
    reversesEntryId: uuid("reverses_entry_id").references((): AnyPgColumn => khataEntries.id),
    createdAt: createdAt(),
  },
  (t) => [
    // Closing a day and re-settling one both read that day's lines (P4.9).
    index("khata_entries_business_date_idx").on(t.businessDate),
    // One person's ledger on the Staff khata screen (P4.10). Measured against
    // 10,000 generated rows: this gets a bitmap index scan. `amount` is
    // deliberately NOT included -- the balances query is a `group by` that has
    // to read every row anyway, and Postgres chose a sequential scan over an
    // index-only scan even when offered (staff_id, amount).
    index("khata_entries_staff_id_idx").on(t.staffId),
  ],
);
