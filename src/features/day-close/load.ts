import { asc, eq, sql } from "drizzle-orm";
import type { db } from "@/db";
import { billCancellations, billLines, bills, cashEntries, khataEntries, staff } from "@/db/schema";
import type { Bill, FolderEntry, PayType, Rupees, StaffPay } from "@/lib/accounting";

/** Anything that can run selects: the db itself or a transaction. */
type Reader = Pick<typeof db, "select">;

export interface LoadedStaff {
  id: string;
  name: string;
  pay: StaffPay;
}

export interface LoadedDay {
  bills: Bill[];
  entries: FolderEntry[];
  staff: LoadedStaff[];
}

/**
 * Read one business day's bills, folder entries and staff, in the shapes the
 * accounting functions expect. Used by both the screen and the closing
 * transaction, so they can never disagree.
 */
export async function loadDay(reader: Reader, businessDate: string): Promise<LoadedDay> {
  const [billRows, lineRows, cancelRows, entryRows, staffRows] = await Promise.all([
    reader.select().from(bills).where(eq(bills.businessDate, businessDate)).orderBy(asc(bills.billNo)),
    reader
      .select({ billId: billLines.billId, staffId: billLines.staffId, amount: billLines.amount })
      .from(billLines)
      .innerJoin(bills, eq(billLines.billId, bills.id))
      .where(eq(bills.businessDate, businessDate)),
    reader
      .select({ billId: billCancellations.billId })
      .from(billCancellations)
      .innerJoin(bills, eq(billCancellations.billId, bills.id))
      .where(eq(bills.businessDate, businessDate)),
    reader
      .select({ kind: cashEntries.kind, amount: cashEntries.amount, paidFrom: cashEntries.paidFrom })
      .from(cashEntries)
      .where(eq(cashEntries.businessDate, businessDate)),
    reader.select().from(staff).orderBy(asc(staff.createdAt), asc(staff.name)),
  ]);

  const cancelled = new Set(cancelRows.map((row) => row.billId));
  const workedToday = new Set(lineRows.map((line) => line.staffId));

  return {
    bills: billRows.map<Bill>((bill) => ({
      status: bill.reversesBillId ? "reversal" : cancelled.has(bill.id) ? "cancelled" : "active",
      cash: bill.cash,
      online: bill.online,
      lines: lineRows
        .filter((line) => line.billId === bill.id)
        .map(({ staffId, amount }) => ({ staffId, amount })),
    })),
    entries: entryRows,
    // Active staff, plus anyone deactivated today who still has bills on this day.
    staff: staffRows
      .filter((row) => row.active || workedToday.has(row.id))
      .map((row) => ({
        id: row.id,
        name: row.name,
        pay: {
          payType: row.payType as PayType,
          salary: row.salary,
          dailyWage: row.dailyWage,
          commissionRate: row.commissionRate,
        },
      })),
  };
}

/** Running khata balance for each staff member. */
export async function loadKhataBalances(reader: Reader): Promise<Record<string, Rupees>> {
  const rows = await reader
    .select({ staffId: khataEntries.staffId, balance: sql<number>`coalesce(sum(${khataEntries.amount}), 0)` })
    .from(khataEntries)
    .groupBy(khataEntries.staffId);
  return Object.fromEntries(rows.map((row) => [row.staffId, Number(row.balance)]));
}
