import { sql } from "drizzle-orm";
import type { Tx } from "@/db/day-settlement";

/**
 * Open the append-only triggers for the rest of this transaction, and this
 * transaction only (backlog P1.6, migration `0012_developer_edit_hatch`).
 *
 * **This is the only place in the app that may set it** — a conventions test
 * fails on any other file that names the setting. If a second one ever
 * appeared, the guarantee would stop being something you can check by reading
 * one file.
 *
 * Two things keep it bounded. The value is this transaction's own id: since
 * P7.14 (migration `0023`, QA-24) the triggers open only for a setting that
 * names the transaction they run in, so a `SET app.allow_financial_edit` made
 * for a whole session — which used to open every financial table for the rest
 * of it, pooled requests included — opens nothing. And `is_local = true` resets
 * it when the transaction commits or rolls back. Nothing has to remember to
 * close it.
 *
 * The audit log and `day_snapshot_history` are not reachable this way at all —
 * they run a trigger function no setting opens. Whatever is changed here stays
 * on the record.
 *
 * Call `denyFinancialEdit` as soon as the rows are written, so the rest of the
 * transaction runs shut again.
 */
export async function allowFinancialEdit(tx: Tx): Promise<void> {
  await tx.execute(sql`select set_config('app.allow_financial_edit', pg_current_xact_id()::text, true)`);
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
