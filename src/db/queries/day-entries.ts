import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cashEntries, staff } from "@/db/schema";
import type { FolderKind, PaidFrom, Rupees } from "@/lib/accounting";

/** One row of a day's folders, as the Daily folders screen lists it. */
export interface DayEntry {
  id: string;
  /** The id the folders screen gave it (P2.2e); null on older rows and on cancellations. */
  clientId: string | null;
  createdAt: string;
  kind: FolderKind;
  /** Negative on a cancellation row. */
  amount: Rupees;
  description: string | null;
  paidFrom: PaidFrom | null;
  staffName: string | null;
  pinConfirmed: boolean;
  /** This row cancels an earlier entry. */
  isVoid: boolean;
  /** A later row has cancelled this entry. */
  voided: boolean;
}

/**
 * Every folder entry of one business day, newest first. The Daily folders
 * screen reads it, and so does the counter's offline copy of the day (P2.2e),
 * so the two list the same rows the same way.
 */
export async function getDayEntries(businessDate: string): Promise<DayEntry[]> {
  const rows = await db
    .select({
      id: cashEntries.id,
      clientId: cashEntries.clientId,
      createdAt: cashEntries.createdAt,
      kind: cashEntries.kind,
      amount: cashEntries.amount,
      description: cashEntries.description,
      paidFrom: cashEntries.paidFrom,
      pinConfirmed: cashEntries.pinConfirmed,
      voidsEntryId: cashEntries.voidsEntryId,
      staffName: staff.name,
    })
    .from(cashEntries)
    .leftJoin(staff, eq(cashEntries.staffId, staff.id))
    .where(eq(cashEntries.businessDate, businessDate))
    .orderBy(desc(cashEntries.createdAt));

  const cancelled = new Set(rows.flatMap((row) => (row.voidsEntryId ? [row.voidsEntryId] : [])));

  return rows.map((row) => ({
    id: row.id,
    clientId: row.clientId,
    createdAt: row.createdAt.toISOString(),
    kind: row.kind,
    amount: row.amount,
    description: row.description,
    paidFrom: row.paidFrom,
    staffName: row.staffName,
    pinConfirmed: row.pinConfirmed,
    isVoid: row.voidsEntryId !== null,
    voided: cancelled.has(row.id),
  }));
}
