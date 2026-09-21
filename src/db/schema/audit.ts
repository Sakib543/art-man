import { boolean, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id } from "./_shared";

/** Who did what and when, including failed attempts. Append-only. */
export const auditLog = pgTable("audit_log", {
  id: id(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  target: text("target"),
  before: jsonb("before"),
  after: jsonb("after"),
  success: boolean("success").notNull().default(true),
  createdAt: createdAt(),
});
