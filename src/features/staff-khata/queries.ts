import { and, asc, eq, gte, isNotNull, lt, sum } from "drizzle-orm";
import { db } from "@/db";
import { getMonthChoices, type MonthChoice } from "@/db/queries/months";
import { billLines, bills, businessDays, khataEntries, monthCloses, staff } from "@/db/schema";
import { withRunningBalance, type KhataKind, type PayType, type Rupees } from "@/lib/accounting";
import { cancellableKinds } from "./rules";
import { formatMonth, monthStart, nextMonth } from "@/lib/business-date";
import type { SlipLine } from "./slip";

export interface KhataStaff {
  id: string;
  name: string;
  payType: PayType;
  salary: Rupees;
  commissionRate: number;
  /** Rupees for an hour of overtime (P3.18); 0 when none is set. */
  overtimeRate: Rupees;
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
  /**
   * Overtime or a deduction (P3.18) that has not been cancelled, in a month
   * still open: the Owner may cancel it from the ledger.
   */
  cancellable: boolean;
}

export interface KhataData {
  staff: KhataStaff[];
  selected: KhataStaff;
  /** The months with a business day, newest first: what the month picker offers. */
  months: MonthChoice[];
  /** The month the ledger shows ("2026-09"), and as it reads; null before the first business day. */
  month: string | null;
  monthLabel: string | null;
  /** Is it the latest business day's month — the one a bonus goes into? */
  currentMonth: boolean;
  /** Has the month shown been closed? Until then its figures are provisional. */
  monthClosed: boolean;
  /** The balance before the month began: every earlier line, added up. */
  broughtForward: Rupees;
  /** The month's lines, each with the balance after it. */
  ledger: LedgerRow[];
  /** The balance at the end of the month shown: brought forward plus the month. */
  closingBalance: Rupees;
}

/**
 * Within one day, money in comes before money out. Entries made in the same
 * transaction (Day Close) share one timestamp, so the time alone cannot order them.
 */
const KIND_ORDER: Record<string, number> = { earning: 0, bonus: 0, overtime: 0, adjustment: 1, deduction: 1, advance: 2, payment: 3 };

/** One person's lines, in the order the ledger reads them. */
type LedgerEntry = {
  id: string;
  businessDate: string;
  label: string;
  amount: Rupees;
  kind: KhataKind;
  reversesEntryId: string | null;
  createdAt: Date;
};

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
 * All staff with their balances, plus one month of one person's ledger. Null
 * when there is no staff yet.
 *
 * The screen wants two things, and neither of them is the whole table: one
 * number per staff member, and one person's lines. So the sum is grouped in
 * the database and the ledger is asked for by `staff_id` (backlog P4.10) —
 * and, since P7.15 (QA-42), for one month, with everything before it summed in
 * the database as the balance brought forward: the salary slip's shape. The
 * whole ledger of a daily-wage karigar was 1.4 MB of page after a year, and
 * grew by as much every year; a month is about a hundred lines.
 *
 * The month is `?month=` when it has a business day, otherwise the latest
 * business day's. Which member is selected depends on the staff list, because
 * an unknown `?staff=` falls back to the first one — so the ledger cannot be
 * fetched in the same breath as the list, the balances and the months.
 */
export async function getKhataData(requestedId?: string, requestedMonth?: string): Promise<KhataData | null> {
  const [staffRows, balances, monthChoices] = await Promise.all([
    db.select().from(staff).orderBy(asc(staff.createdAt), asc(staff.name)),
    db
      .select({ staffId: khataEntries.staffId, balance: sum(khataEntries.amount).mapWith(Number) })
      .from(khataEntries)
      .groupBy(khataEntries.staffId),
    getMonthChoices(),
  ]);
  if (staffRows.length === 0) return null;

  const balanceOf = new Map(balances.map((row) => [row.staffId, row.balance]));

  const list: KhataStaff[] = staffRows.map((row) => ({
    id: row.id,
    name: row.name,
    payType: row.payType as PayType,
    salary: row.salary,
    commissionRate: row.commissionRate,
    overtimeRate: row.overtimeRate,
    active: row.active,
    balance: balanceOf.get(row.id) ?? 0,
  }));

  const selected = list.find((member) => member.id === requestedId) ?? list[0];

  const months = monthChoices?.choices ?? [];
  const shown = months.find((choice) => choice.month === requestedMonth) ?? months.find((choice) => choice.month === monthChoices?.current);
  // Before the first business day there is no month, and no khata line either.
  if (!shown) {
    const empty = { months, month: null, monthLabel: null, currentMonth: false, monthClosed: false };
    return { staff: list, selected, ...empty, broughtForward: 0, ledger: [], closingBalance: selected.balance };
  }

  const start = monthStart(shown.month);
  const [entries, [forward]] = await Promise.all([
    db
      .select({
        id: khataEntries.id,
        businessDate: khataEntries.businessDate,
        label: khataEntries.label,
        amount: khataEntries.amount,
        kind: khataEntries.kind,
        reversesEntryId: khataEntries.reversesEntryId,
        createdAt: khataEntries.createdAt,
      })
      .from(khataEntries)
      .where(
        and(
          eq(khataEntries.staffId, selected.id),
          gte(khataEntries.businessDate, start),
          lt(khataEntries.businessDate, monthStart(nextMonth(shown.month))),
        ),
      ),
    db
      .select({ total: sum(khataEntries.amount).mapWith(Number) })
      .from(khataEntries)
      .where(and(eq(khataEntries.staffId, selected.id), lt(khataEntries.businessDate, start))),
  ]);

  const broughtForward = forward?.total ?? 0;
  // A cancellation is dated with the line it cancels (P3.18), so both are in this month.
  const cancelled = new Set(entries.flatMap((entry) => (entry.reversesEntryId ? [entry.reversesEntryId] : [])));
  const ledger = withRunningBalance(
    [...entries].sort(inLedgerOrder).map(({ id, businessDate, label, amount, kind, reversesEntryId }) => ({
      id,
      businessDate,
      label,
      amount,
      cancellable: !shown.closed && cancellableKinds.includes(kind) && reversesEntryId === null && !cancelled.has(id),
    })),
    broughtForward,
  );

  return {
    staff: list,
    selected,
    months,
    month: shown.month,
    monthLabel: formatMonth(shown.month),
    currentMonth: shown.month === monthChoices?.current,
    monthClosed: shown.closed,
    broughtForward,
    ledger,
    closingBalance: ledger.at(-1)?.balance ?? broughtForward,
  };
}

export interface SlipData {
  staff: { name: string; payType: PayType; commissionRate: number };
  /** Every khata line the person has: the ones before the month make the balance brought forward. */
  lines: SlipLine[];
  /** When the month was closed; null while it is open. */
  closedAt: Date | null;
  /** Work done on the month's closed days — what the commission was worked out on. */
  work: Rupees;
}

/**
 * What one staff member's salary slip for `month` needs (backlog P3.3). Null
 * for someone who does not exist, or a month with no business day.
 *
 * The work is the person's bill lines on the month's **closed** days, the same
 * days their commission was posted for. A cancelled bill and its reversal add
 * up to nothing, and a line's amount is already net of any discount (P3.10),
 * so the sum is what the commission was worked out on.
 */
export async function getSlipData(staffId: string, month: string): Promise<SlipData | null> {
  const start = monthStart(month);
  const end = monthStart(nextMonth(month));

  const [[member], lines, [closeRow], [workRow], [anyDay]] = await Promise.all([
    db
      .select({ name: staff.name, payType: staff.payType, commissionRate: staff.commissionRate })
      .from(staff)
      .where(eq(staff.id, staffId))
      .limit(1),
    db
      .select({
        id: khataEntries.id,
        businessDate: khataEntries.businessDate,
        kind: khataEntries.kind,
        label: khataEntries.label,
        amount: khataEntries.amount,
        reversesEntryId: khataEntries.reversesEntryId,
        cashEntryId: khataEntries.cashEntryId,
      })
      .from(khataEntries)
      .where(eq(khataEntries.staffId, staffId)),
    db.select({ closedAt: monthCloses.closedAt }).from(monthCloses).where(eq(monthCloses.month, start)).limit(1),
    db
      .select({ total: sum(billLines.amount).mapWith(Number) })
      .from(billLines)
      .innerJoin(bills, eq(billLines.billId, bills.id))
      .innerJoin(businessDays, eq(businessDays.businessDate, bills.businessDate))
      .where(
        and(
          eq(billLines.staffId, staffId),
          gte(bills.businessDate, start),
          lt(bills.businessDate, end),
          isNotNull(businessDays.closedAt),
        ),
      ),
    db
      .select({ date: businessDays.businessDate })
      .from(businessDays)
      .where(and(gte(businessDays.businessDate, start), lt(businessDays.businessDate, end)))
      .limit(1),
  ]);
  if (!member || !anyDay) return null;

  return {
    staff: { name: member.name, payType: member.payType as PayType, commissionRate: member.commissionRate },
    lines,
    closedAt: closeRow?.closedAt ?? null,
    work: workRow?.total ?? 0,
  };
}
