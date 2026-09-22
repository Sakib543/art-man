import { boolean, index, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id } from "./_shared";

/** Who did what and when, including failed attempts. Append-only. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    target: text("target"),
    before: jsonb("before"),
    after: jsonb("after"),
    success: boolean("success").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    // This table grows fastest of all — a row per bill, per cancellation, per
    // reset. The developer's log reads it newest first, a page at a time (P4.9).
    index("audit_log_created_at_idx").on(t.createdAt),
    // The wrong-PIN and wrong-password counters ask for one action against one
    // target within the last few minutes, on every failed sign-in attempt.
    index("audit_log_action_target_created_at_idx").on(t.action, t.target, t.createdAt),
  ],
);
