import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, rupees } from "./_shared";

/**
 * Configuration tables. These CAN be edited (changes apply forward only).
 * They are never deleted: deactivate instead so history stays intact.
 */

export const services = pgTable("services", {
  id: id(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  /**
   * The price, or the **bottom** of the range when `maxPrice` is set (P3.11).
   * The salon's printed list reads "300 - 500" against most services.
   */
  price: rupees("price").notNull(),
  /**
   * The top of the range, or null for a service with one fixed price. When it
   * is set, the counter chooses the amount for each line of the bill and the
   * server refuses anything outside `price`..`maxPrice`.
   */
  maxPrice: rupees("max_price"),
  minutes: integer("minutes"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const deals = pgTable("deals", {
  id: id(),
  name: text("name").notNull(),
  price: rupees("price").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const dealItems = pgTable(
  "deal_items",
  {
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
  },
  (t) => [primaryKey({ columns: [t.dealId, t.serviceId] })],
);

export const staff = pgTable(
  "staff",
  {
    id: id(),
    name: text("name").notNull(),
    /** 1 = monthly salary, 2 = salary + commission, 3 = daily wage + commission. */
    payType: smallint("pay_type").notNull(),
    salary: rupees("salary").notNull().default(0),
    dailyWage: rupees("daily_wage").notNull().default(0),
    /** Commission percent, e.g. 10.00 means 10%. */
    commissionRate: numeric("commission_rate", { precision: 5, scale: 2, mode: "number" })
      .notNull()
      .default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [check("staff_pay_type_chk", sql`${t.payType} in (1, 2, 3)`)],
);

export const customers = pgTable(
  "customers",
  {
    id: id(),
    phone: text("phone").notNull(),
    name: text("name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("customers_phone_key").on(t.phone)],
);

/** A fixed price for a regular customer. Applies automatically at billing. */
export const customerSpecialRates = pgTable(
  "customer_special_rates",
  {
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    price: rupees("price").notNull(),
  },
  (t) => [primaryKey({ columns: [t.customerId, t.serviceId] })],
);

export const partners = pgTable("partners", {
  id: id(),
  name: text("name").notNull(),
  /** Profit share percent. Active partners must sum to 100 (checked in the app). */
  sharePct: numeric("share_pct", { precision: 5, scale: 2, mode: "number" }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

/**
 * Switches the developer can flip, one row per switch. Like the other config
 * tables it is editable and has no append-only trigger: only the current value
 * matters, and every change is written to `audit_log` anyway.
 *
 * Today it holds exactly one key, `maintenance` ("on" / "off"). A missing row
 * means off, so the table being empty is the normal state.
 */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  /** Username of whoever last changed it. Kept here so the screen can show it without a join. */
  updatedBy: text("updated_by"),
});
