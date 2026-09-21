import { auditLog } from "@/db/schema";
import type { db } from "@/db";

/** Anything that can run inserts: the db itself or a transaction. */
type Writer = Pick<typeof db, "insert">;

interface AuditEntry {
  actor: string;
  action: string;
  target?: string;
  before?: unknown;
  after?: unknown;
  success?: boolean;
}

/** Record who did what. Call it inside the same transaction as the change it describes. */
export async function writeAudit(writer: Writer, entry: AuditEntry) {
  await writer.insert(auditLog).values({
    actor: entry.actor,
    action: entry.action,
    target: entry.target,
    before: entry.before,
    after: entry.after,
    success: entry.success ?? true,
  });
}
