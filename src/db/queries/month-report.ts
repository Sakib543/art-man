import { and, asc, eq, gte, inArray, lt, sum } from "drizzle-orm";
import { db } from "@/db";
import { getLatestBusinessDay } from "@/db/queries/business-day";
import { getMonthChoices, type MonthChoice } from "@/db/queries/months";
import {
  auditLog,
  capitalRepayments,
  cashEntries,
  daySnapshots,
  khataEntries,
  monthAdjustments,
  monthCloses,
  monthlyExpenses,
  staff,
} from "@/db/schema";
import { adjustmentTotals, buildMonthReport, type MonthDay, type MonthReport, type Rupees } from "@/lib/accounting";
import { formatMonth, monthOf, monthStart, nextMonth } from "@/lib/business-date";

export interface ClosedDayRow extends MonthDay {
  businessDate: string;
}

/**
 * A closed month worked out again after one of its bills was changed in place
 * (backlog P1.10), from its `month.recalculate` audit entry. When, and after
 * which bill — never who: the Owner and the Manager are not shown the
 * developer role (HANDOFF section 6).
 */
export interface MonthRecalculation {
  /** ISO time. */
  at: string;
  billNo: number | null;
  /** The business day the bill is on. */
  billDate: string | null;
  netProfitBefore: Rupees;
  netProfitAfter: Rupees;
}

export interface MonthlyReportData {
  month: string;
  monthLabel: string;
  closed: boolean;
  months: MonthChoice[];
  /** What the screen shows: the saved report for a closed month, otherwise the live one. */
  report: MonthReport;
  /** Always freshly worked out from the entries. Month close saves this. */
  live: MonthReport;
  days: ClosedDayRow[];
  /** The day still open in this month. It is added to the report when it is closed. */
  openDay: string | null;
  /** Each time the closed month's saved report was worked out again, oldest first. */
  recalculations: MonthRecalculation[];
}

/**
 * One month's report: the closed days' snapshots plus the monthly expenses.
 * Null before the first business day. Nothing here is stored: it is worked out
 * from the entries every time, so it can never disagree with them.
 */
export async function getMonthlyReport(requestedMonth?: string): Promise<MonthlyReportData | null> {
  const choices = await getMonthChoices();
  if (!choices) return null;

  const month = choices.choices.some((choice) => choice.month === requestedMonth) ? requestedMonth! : choices.current;
  const start = monthStart(month);
  const end = monthStart(nextMonth(month));

  const [snapshots, expenseRows, repayments, staffRows, [closeRow], latest, [bonusRow], adjustmentRows, recalculationRows] = await Promise.all([
    db.select().from(daySnapshots).where(and(gte(daySnapshots.businessDate, start), lt(daySnapshots.businessDate, end))).orderBy(asc(daySnapshots.businessDate)),
    db.select().from(monthlyExpenses).where(eq(monthlyExpenses.month, start)),
    db.select({ amount: capitalRepayments.amount }).from(capitalRepayments).where(and(gte(capitalRepayments.paidOn, start), lt(capitalRepayments.paidOn, end))),
    db.select({ salary: staff.salary, payType: staff.payType, active: staff.active }).from(staff),
    db.select().from(monthCloses).where(eq(monthCloses.month, start)).limit(1),
    getLatestBusinessDay(),
    // Bonuses are khata lines, not day-snapshot figures, so they have to be
    // asked for separately or they would never reach the profit (backlog P3.1).
    // `sum()` of an integer column comes back as a string -- hence mapWith.
    db
      .select({ total: sum(khataEntries.amount).mapWith(Number) })
      .from(khataEntries)
      .where(and(eq(khataEntries.kind, "bonus"), gte(khataEntries.businessDate, start), lt(khataEntries.businessDate, end))),
    // Adjustments for earlier, closed months counted in this one (backlog P3.4),
    // cancellations included: each is its adjustment with the sign turned.
    db
      .select({ kind: monthAdjustments.kind, amount: monthAdjustments.amount, online: monthAdjustments.online, paidFrom: monthAdjustments.paidFrom })
      .from(monthAdjustments)
      .where(eq(monthAdjustments.month, start)),
    // Only a closed month has any (P1.10). Found through the audit log's
    // (action, target, created_at) index.
    db
      .select({ createdAt: auditLog.createdAt, before: auditLog.before, after: auditLog.after })
      .from(auditLog)
      .where(and(eq(auditLog.action, "month.recalculate"), eq(auditLog.target, month)))
      .orderBy(asc(auditLog.createdAt)),
  ]);

  // Owner cash and owner-paid expenses come from the entries of the closed days only,
  // the same days the snapshots cover.
  const closedDates = snapshots.map((s) => s.businessDate);
  const entryRows = closedDates.length
    ? await db
        .select({ kind: cashEntries.kind, amount: cashEntries.amount, paidFrom: cashEntries.paidFrom })
        .from(cashEntries)
        .where(inArray(cashEntries.businessDate, closedDates))
    : [];

  const ownerTookCash = entryRows.filter((e) => e.kind === "owner_took").reduce((sum, e) => sum + e.amount, 0);
  const dailyExpensesPaidByOwner = entryRows
    .filter((e) => e.kind === "expense" && e.paidFrom === "owner")
    .reduce((sum, e) => sum + e.amount, 0);

  // Monthly salaries of staff on pay types 1 and 2. Provisional until the month is closed.
  const salaries = staffRows.filter((s) => s.active && (s.payType === 1 || s.payType === 2)).reduce((sum, s) => sum + s.salary, 0);

  const days: ClosedDayRow[] = snapshots.map((s) => ({
    businessDate: s.businessDate,
    sale: s.sale,
    cash: s.cash,
    online: s.online,
    expenses: s.expenses,
    staffEarned: s.staffEarned,
    staffPaid: s.staffPaid,
    dayProfit: s.dayProfit,
  }));

  const live = buildMonthReport({
    days,
    monthlyExpenses: expenseRows.map((e) => ({ kind: e.kind, amount: e.amount, paidFrom: e.paidFrom })),
    salaries,
    bonuses: bonusRow?.total ?? 0,
    ownerTookCash,
    dailyExpensesPaidByOwner,
    capitalRepaid: repayments.reduce((sum, r) => sum + r.amount, 0),
    adjustments: adjustmentTotals(adjustmentRows),
  });

  // A closed month shows the report saved at the moment it was closed, not a fresh
  // calculation, so a later change (a new salary, say) cannot alter it.
  const closed = closeRow !== undefined;
  const report = (closeRow?.report as MonthReport | null | undefined) ?? live;

  const openDay = latest && latest.closedAt === null && monthOf(latest.businessDate) === month ? latest.businessDate : null;

  // Written by the developer's bill edit (`recalculateClosedMonth`) in this shape.
  const recalculations = recalculationRows.map((row): MonthRecalculation => {
    const before = (row.before ?? {}) as { netProfit?: number };
    const after = (row.after ?? {}) as { netProfit?: number; billNo?: number; businessDate?: string };
    return {
      at: row.createdAt.toISOString(),
      billNo: after.billNo ?? null,
      billDate: after.businessDate ?? null,
      netProfitBefore: before.netProfit ?? 0,
      netProfitAfter: after.netProfit ?? 0,
    };
  });

  return { month, monthLabel: formatMonth(month), closed, months: choices.choices, report, live, days, openDay, recalculations };
}
