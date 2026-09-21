import { integer, timestamp, uuid } from "drizzle-orm/pg-core";

/** Whole rupees as an integer. See src/lib/accounting/types.ts. */
export const rupees = (name: string) => integer(name);

export const id = () => uuid("id").primaryKey().defaultRandom();

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
