import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { getOpenBusinessDay } from "@/db/queries/business-day";
import { bills, cashEntries, customers, staff } from "@/db/schema";
import { folderTotals } from "@/lib/accounting";
import type { EntryRow, FoldersData, OnlineRow } from "./types";

/** Everything the Daily folders screen needs, or null when no business day is open. */
export async function getFoldersData(): Promise<FoldersData | null> {
  const day = await getOpenBusinessDay();
  if (!day) return null;

  const [entryRows, onlineRows, staffRows] = await Promise.all([
    db
      .select({
        id: cashEntries.id,
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
      .where(eq(cashEntries.businessDate, day.businessDate))
      .orderBy(desc(cashEntries.createdAt)),
    db
      .select({
        billNo: bills.billNo,
        createdAt: bills.createdAt,
        amount: bills.online,
        customerName: customers.name,
      })
      .from(bills)
      .leftJoin(customers, eq(bills.customerId, customers.id))
      .where(and(eq(bills.businessDate, day.businessDate), ne(bills.online, 0)))
      .orderBy(desc(bills.createdAt)),
    db.select({ id: staff.id, name: staff.name }).from(staff).where(eq(staff.active, true)).orderBy(asc(staff.name)),
  ]);

  const cancelled = new Set(entryRows.flatMap((row) => (row.voidsEntryId ? [row.voidsEntryId] : [])));

  const entries: EntryRow[] = entryRows.map((row) => ({
    id: row.id,
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

  const online: OnlineRow[] = onlineRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));

  return {
    businessDate: day.businessDate,
    entries,
    online,
    staff: staffRows,
    // Cancellation rows carry negative amounts, so they cancel their original in the totals.
    totals: folderTotals(entries, online.reduce((sum, row) => sum + row.amount, 0)),
  };
}
