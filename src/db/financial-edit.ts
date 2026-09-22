import { sql } from "drizzle-orm";
import type { Tx } from "@/db/day-settlement";

/**
 * Open the append-only triggers for the rest of this transaction, and this
 * transaction only (backlog P1.6, migration `0012_developer_edit_hatch`).
 *
 * **This is the only place in the app that may call `set_config` for it.** If
 * a second one ever appears, the guarantee stops being something you can check
 * by reading one file.
 *
 * `is_local = true` is what keeps it bounded: PostgreSQL resets the setting
 * when the transaction commits or rolls back, so it cannot survive on a pooled
 * connection and reach the next request. Nothing has to remember to close it.
 *
 * The audit log and `day_snapshot_history` are not reachable this way at all —
 * they run a trigger function no setting opens. Whatever is changed here stays
 * on the record.
 *
 * Call `denyFinancialEdit` as soon as the rows are written, so the rest of the
 * transaction runs shut again.
 */
export async function allowFinancialEdit(tx: Tx): Promise<void> {
  await tx.execute(sql`select set_config('app.allow_financial_edit', 'on', true)`);
}

/**
 * Shut it again, without waiting for the transaction to end. The rest of a
 * correction — settling the day again, writing the audit entry — does not need
 * the hatch, so it should not have it. Keeping the window down to the two
 * statements that actually need it is the difference between "a bug in this
 * transaction cannot change a financial row" and "it can".
 */
export async function denyFinancialEdit(tx: Tx): Promise<void> {
  await tx.execute(sql`select set_config('app.allow_financial_edit', 'off', true)`);
}
