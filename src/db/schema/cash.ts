import { boolean, date, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, rupees } from "./_shared";
import { cashEntryKindEnum, khataKindEnum, paidFromEnum } from "./enums";
import { staff } from "./config";

/** Daily folders: expenses, staff money, owner cash. Append-only, like bills. */
export const cashEntries = pgTable("cash_entries", {
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
});

/** Running staff ledger. Positive = owed to staff, negative = taken. Append-only. */
export const khataEntries = pgTable("khata_entries", {
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
  createdAt: createdAt(),
});
