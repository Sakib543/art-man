import { asc, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { getLatestBusinessDay } from "@/db/queries/business-day";
import { isMonthClosed } from "@/db/queries/months";
import { khataEntries, staff } from "@/db/schema";
import { withRunningBalance, type PayType, type Rupees } from "@/lib/accounting";
import { monthOf } from "@/lib/business-date";

export interface KhataStaff {
  id: string;
  name: string;
  payType: PayType;
  salary: Rupees;
  commissionRate: number;
  active: boolean;
  balance: Rupees;
}

export interface LedgerRow {
  id: string;
  businessDate: string;
  label: string;
  /** Positive = owed to the staff member, negative = taken. */
  amount: Rupees;
  balance: Rupees;
}

export interface KhataData {
  staff: KhataStaff[];
  selected: KhataStaff;
  ledger: LedgerRow[];
  /** Has the current month been closed? Until then the khata figures are provisional. */
  monthClosed: boolean;
}

/**
 * Within one day, money in comes before money out. Entries made in the same
 * transaction (Day Close) share one timestamp, so the time alone cannot order them.
 */
const KIND_ORDER: Record<string, number> = { earning: 0, bonus: 0, adjustment: 1, advance: 2, payment: 3 };

/** One person's lines, in the order the ledger reads them. */
type LedgerEntry = { id: string; businessDate: string; label: string; amount: Rupees; kind: string; createdAt: Date };

/**
 * Within a day, money in before money out; then the clock; then the id, so the
 * order is total and a reload never shuffles two identical-looking rows.
 *
 * This stays in JavaScript rather than becoming a SQL `case`: it is the same
 * rule `KIND_ORDER` states above, and it now sorts one person's lines, not the
 * whole table.
 */
const inLedgerOrder = (a: LedgerEntry, b: LedgerEntry): number =>
  a.businessDate.localeCompare(b.businessDate) ||
  (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9) ||
  a.createdAt.getTime() - b.createdAt.getTime() ||
  a.id.localeCompare(b.id);

/**
 * All staff with their balances, plus the ledger of one of them. Null when
 * there is no staff yet.
 *
 * The screen wants two things, and neither of them is the whole table: one
 * number per staff member, and one person's lines. So the sum is grouped in
 * the database and the ledger is asked for by `staff_id` (backlog P4.10).
 *
 * Which member is selected depends on the staff list, because an unknown
 * `?staff=` falls back to the first one — so the ledger cannot be fetched in
 * the same breath. It is still one wait fewer than before, since the month
 * check used to queue up behind both selects instead of beside the ledger.
 */
export async function getKhataData(requestedId?: string): Promise<KhataData | null> {
  const [staffRows, balances, latest] = await Promise.all([
    db.select().from(staff).orderBy(asc(staff.createdAt), asc(staff.name)),
    db
      .select({ staffId: khataEntries.staffId, balance: sum(khataEntries.amount).mapWith(Number) })
      .from(khataEntries)
      .groupBy(khataEntries.staffId),
    getLatestBusinessDay(),
  ]);
  if (staffRows.length === 0) return null;

  const balanceOf = new Map(balances.map((row) => [row.staffId, row.balance]));

  const list: KhataStaff[] = staffRows.map((row) => ({
    id: row.id,
    name: row.name,
    payType: row.payType as PayType,
    salary: row.salary,
    commissionRate: row.commissionRate,
    active: row.active,
    balance: balanceOf.get(row.id) ?? 0,
  }));

  const selected = list.find((member) => member.id === requestedId) ?? list[0];

  const [entries, monthClosed] = await Promise.all([
    db
      .select({
        id: khataEntries.id,
        businessDate: khataEntries.businessDate,
        label: khataEntries.label,
        amount: khataEntries.amount,
        kind: khataEntries.kind,
        createdAt: khataEntries.createdAt,
      })
      .from(khataEntries)
      .where(eq(khataEntries.staffId, selected.id)),
    latest ? isMonthClosed(monthOf(latest.businessDate)) : Promise.resolve(false),
  ]);

  const ledger = withRunningBalance(
    [...entries]
      .sort(inLedgerOrder)
      .map(({ id, businessDate, label, amount }) => ({ id, businessDate, label, amount })),
  );

  return { staff: list, selected, ledger, monthClosed };
}
