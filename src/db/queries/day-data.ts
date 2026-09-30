import { asc, eq, sql } from "drizzle-orm";
import type { db } from "@/db";
import { attendance, billCancellations, billLines, bills, cashEntries, khataEntries, staff } from "@/db/schema";
import { settledStaff, type Bill, type FolderEntry, type PayType, type Rupees, type StaffPay } from "@/lib/accounting";

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

/** A closed day as it is settled again (P7.3): who was on its list, and whether they were present. */
export interface SettledDay extends LoadedDay {
  present: Record<string, boolean>;
}

/** Everything both loaders read, before either decides whose pay counts. */
async function readDay(reader: Reader, businessDate: string) {
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
    staffRows,
    workedToday,
    bills: billRows.map<Bill>((bill) => ({
      status: bill.reversesBillId ? "reversal" : cancelled.has(bill.id) ? "cancelled" : "active",
      cash: bill.cash,
      online: bill.online,
      lines: lineRows
        .filter((line) => line.billId === bill.id)
        .map(({ staffId, amount }) => ({ staffId, amount })),
    })),
    entries: entryRows,
  };
}

const payOf = (row: { payType: number; salary: number; dailyWage: number; commissionRate: number }): StaffPay => ({
  payType: row.payType as PayType,
  salary: row.salary,
  dailyWage: row.dailyWage,
  commissionRate: row.commissionRate,
});

/**
 * Read one business day's bills, folder entries and staff, in the shapes the
 * accounting functions expect. Used by both the screen and the closing
 * transaction, so they can never disagree. The staff are today's, on their
 * pay now: this is the day being closed.
 */
export async function loadDay(reader: Reader, businessDate: string): Promise<LoadedDay> {
  const { bills, entries, staffRows, workedToday } = await readDay(reader, businessDate);
  return {
    bills,
    entries,
    // Active staff, plus anyone deactivated today who still has bills on this day.
    staff: staffRows
      .filter((row) => row.active || workedToday.has(row.id))
      .map((row) => ({ id: row.id, name: row.name, pay: payOf(row) })),
  };
}

/**
 * Read a closed day to settle it again after a correction (P7.3, QA-04): its
 * bills and entries as they stand now, and its staff as Day close saved them
 * in `attendance` — that day's list, on that day's pay (`settledStaff`). Before
 * P7.3 this read today's staff on today's rates, so a correction to an old day
 * paid a raise backwards, a wage to someone who joined later, and took a wage
 * away from someone who had left since.
 */
export async function loadSettledDay(reader: Reader, businessDate: string): Promise<SettledDay> {
  const { bills, entries, staffRows, workedToday } = await readDay(reader, businessDate);
  const marked = await reader.select().from(attendance).where(eq(attendance.businessDate, businessDate));

  const list = settledStaff(
    marked.map((row) => ({
      staffId: row.staffId,
      present: row.present,
      pay:
        row.payType === null
          ? null
          : payOf({ payType: row.payType, salary: row.salary ?? 0, dailyWage: row.dailyWage ?? 0, commissionRate: row.commissionRate ?? 0 }),
    })),
    staffRows.map((row) => ({ id: row.id, pay: payOf(row) })),
    workedToday,
  );
  const names = new Map(staffRows.map((row) => [row.id, row.name]));

  return {
    bills,
    entries,
    staff: list.map((member) => ({ id: member.id, name: names.get(member.id) ?? "", pay: member.pay })),
    present: Object.fromEntries(list.map((member) => [member.id, member.present])),
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
