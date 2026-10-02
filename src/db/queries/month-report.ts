import { and, asc, eq, gte, inArray, lt, sum } from "drizzle-orm";
import { db } from "@/db";
import { getLatestBusinessDay } from "@/db/queries/business-day";
import { getMonthChoices, type MonthChoice } from "@/db/queries/months";
import {
  capitalRepayments,
  cashEntries,
  daySnapshots,
  khataEntries,
  monthAdjustments,
  monthCloses,
  monthlyExpenses,
  staff,
} from "@/db/schema";
import { adjustmentTotals, buildMonthReport, type MonthDay, type MonthReport } from "@/lib/accounting";
import { formatMonth, monthOf, monthStart, nextMonth } from "@/lib/business-date";

export interface ClosedDayRow extends MonthDay {
  businessDate: string;
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

  const [snapshots, expenseRows, repayments, staffRows, [closeRow], latest, extraRows, adjustmentRows] = await Promise.all([
    db.select().from(daySnapshots).where(and(gte(daySnapshots.businessDate, start), lt(daySnapshots.businessDate, end))).orderBy(asc(daySnapshots.businessDate)),
    db.select().from(monthlyExpenses).where(eq(monthlyExpenses.month, start)),
    db.select({ amount: capitalRepayments.amount }).from(capitalRepayments).where(and(gte(capitalRepayments.paidOn, start), lt(capitalRepayments.paidOn, end))),
    db.select({ salary: staff.salary, payType: staff.payType, active: staff.active }).from(staff),
    db.select().from(monthCloses).where(eq(monthCloses.month, start)).limit(1),
    getLatestBusinessDay(),
    // Bonuses (backlog P3.1), overtime and deductions (P3.18) are khata lines,
    // not day-snapshot figures, so they have to be asked for separately or they
    // would never reach the profit. A cancellation is a line of the same kind
    // on the same date, so each sum is already net of it. `sum()` of an
    // integer column comes back as a string -- hence mapWith.
    db
      .select({ kind: khataEntries.kind, total: sum(khataEntries.amount).mapWith(Number) })
      .from(khataEntries)
      .where(
        and(
          inArray(khataEntries.kind, ["bonus", "overtime", "deduction"]),
          gte(khataEntries.businessDate, start),
          lt(khataEntries.businessDate, end),
        ),
      )
      .groupBy(khataEntries.kind),
    // Adjustments for earlier, closed months counted in this one (backlog P3.4),
    // cancellations included: each is its adjustment with the sign turned.
    db
      .select({ kind: monthAdjustments.kind, amount: monthAdjustments.amount, online: monthAdjustments.online, paidFrom: monthAdjustments.paidFrom })
      .from(monthAdjustments)
      .where(eq(monthAdjustments.month, start)),
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

  const extra = (kind: "bonus" | "overtime" | "deduction") => extraRows.find((row) => row.kind === kind)?.total ?? 0;

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
    bonuses: extra("bonus"),
    overtime: extra("overtime"),
    // Taken off the khata, so negative there; a positive cost saved here.
    deductions: -extra("deduction"),
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

  return { month, monthLabel: formatMonth(month), closed, months: choices.choices, report, live, days, openDay };
}
