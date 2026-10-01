import type { AdjustmentTotals } from "./adjustments";
import { netProfit, ownerAccount, type OwnerAccount } from "./month";
import type { PaidFrom } from "./folders";
import type { Rupees } from "./types";

/**
 * The monthly report, built from the closed days' snapshots plus the monthly
 * expenses. Nothing is typed in by hand: change an entry and the report follows.
 */

export interface MonthDay {
  sale: Rupees;
  cash: Rupees;
  online: Rupees;
  /** Daily expenses (drawer and Owner-paid). */
  expenses: Rupees;
  staffEarned: Rupees;
  staffPaid: Rupees;
  dayProfit: Rupees;
}

export interface MonthlyExpenseEntry {
  kind: "fixed" | "other";
  /** Negative on a cancellation or a downward correction. */
  amount: Rupees;
  paidFrom: PaidFrom;
}

export interface MonthlyExpenseTotals {
  fixed: Rupees;
  others: Rupees;
  total: Rupees;
  /** The part the Owner paid from his own account. */
  paidByOwner: Rupees;
}

export function monthlyExpenseTotals(entries: MonthlyExpenseEntry[]): MonthlyExpenseTotals {
  let fixed = 0;
  let others = 0;
  let paidByOwner = 0;
  for (const entry of entries) {
    if (entry.kind === "fixed") fixed += entry.amount;
    else others += entry.amount;
    if (entry.paidFrom === "owner") paidByOwner += entry.amount;
  }
  return { fixed, others, total: fixed + others, paidByOwner };
}

export interface MonthReportInput {
  days: MonthDay[];
  monthlyExpenses: MonthlyExpenseEntry[];
  /** Monthly salaries of staff on pay types 1 and 2. */
  salaries: Rupees;
  /**
   * Bonuses given this month (backlog P3.1). They are not in the days'
   * snapshots: a bonus is a khata line, given on the Owner's word rather than
   * worked out from the day's bills, so it has to be counted here or it would
   * never reach the profit at all.
   */
  bonuses: Rupees;
  /** Cash the Owner took from the drawer during the month, net of cancellations. */
  ownerTookCash: Rupees;
  /** Daily expenses the Owner paid from his own account. */
  dailyExpensesPaidByOwner: Rupees;
  capitalRepaid: Rupees;
  /**
   * Adjustments for earlier, closed months recorded in this one (backlog
   * P3.4), added up by `adjustmentTotals`. None when left out.
   */
  adjustments?: AdjustmentTotals;
}

export interface MonthReport {
  closedDays: number;
  sales: Rupees;
  cash: Rupees;
  online: Rupees;
  dailyExpenses: Rupees;
  fixed: Rupees;
  others: Rupees;
  salaries: Rupees;
  staffEarned: Rupees;
  bonuses: Rupees;
  staffPaid: Rupees;
  /** Sum of the days' own profits, before monthly expenses and salaries. */
  dayProfitTotal: Rupees;
  netProfit: Rupees;
  owner: OwnerAccount;
  capitalRepaid: Rupees;
  /**
   * What adjustments for earlier, closed months did to this month's profit
   * (backlog P3.4).
   */
  adjustments: Rupees;
  /**
   * What those adjustments changed in the money that reached the Owner: online
   * a corrected sale did or did not bring, less a corrected cost he paid
   * himself. Already inside `owner.heldByBusiness`; kept apart so the Owner
   * account can show it as a line of its own.
   */
  adjustmentsToOwner: Rupees;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function buildMonthReport(input: MonthReportInput): MonthReport {
  const sales = sum(input.days.map((d) => d.sale));
  const online = sum(input.days.map((d) => d.online));
  const dailyExpenses = sum(input.days.map((d) => d.expenses));
  const staffEarned = sum(input.days.map((d) => d.staffEarned));
  const expenses = monthlyExpenseTotals(input.monthlyExpenses);
  const adjustments = input.adjustments ?? { profit: 0, online: 0, paidByOwner: 0 };
  const adjustmentsToOwner = adjustments.online - adjustments.paidByOwner;

  const profit = netProfit({
    totalSales: sales,
    dailyExpenses,
    monthlyExpenses: expenses.total,
    staffEarnings: staffEarned + input.salaries + input.bonuses,
    adjustments: adjustments.profit,
  });

  return {
    closedDays: input.days.length,
    sales,
    cash: sum(input.days.map((d) => d.cash)),
    online,
    dailyExpenses,
    fixed: expenses.fixed,
    others: expenses.others,
    salaries: input.salaries,
    staffEarned,
    bonuses: input.bonuses,
    staffPaid: sum(input.days.map((d) => d.staffPaid)),
    dayProfitTotal: sum(input.days.map((d) => d.dayProfit)),
    netProfit: profit,
    owner: ownerAccount({
      netProfit: profit,
      onlineReceived: online,
      cashTaken: input.ownerTookCash,
      paidFromOwnPocket: input.dailyExpensesPaidByOwner + expenses.paidByOwner,
      capitalRepaid: input.capitalRepaid,
      adjustments: adjustmentsToOwner,
    }),
    capitalRepaid: input.capitalRepaid,
    adjustments: adjustments.profit,
    adjustmentsToOwner,
  };
}

/**
 * A closed month's report, worked out again after one of its closed days was
 * settled again — a bill the developer changed in place (backlog P1.10, the
 * client's decision of 2026-09-29).
 *
 * Only what such a change can move is read again: the days' snapshots, which
 * settling the day has just rewritten. Everything else stays as the month
 * closed with it — the salaries above all, since the staff settings they came
 * from may have changed since, and with them the monthly expenses, bonuses,
 * the Owner's cash, capital repaid and adjustments. The net profit and the
 * Owner account move by what the days moved, so the result is what the close
 * would have saved had the days read this way then.
 */
export function recalculateMonthReport(closed: MonthReport, days: MonthDay[]): MonthReport {
  const sales = sum(days.map((d) => d.sale));
  const online = sum(days.map((d) => d.online));
  const dailyExpenses = sum(days.map((d) => d.expenses));
  const staffEarned = sum(days.map((d) => d.staffEarned));

  // Of everything the net profit is made of, only these three are the days'.
  const profitMoved = sales - closed.sales - (dailyExpenses - closed.dailyExpenses) - (staffEarned - closed.staffEarned);
  // Online money went to the Owner's bank; cash stayed with the business.
  const onlineMoved = online - closed.online;

  return {
    ...closed,
    closedDays: days.length,
    sales,
    cash: sum(days.map((d) => d.cash)),
    online,
    dailyExpenses,
    staffEarned,
    staffPaid: sum(days.map((d) => d.staffPaid)),
    dayProfitTotal: sum(days.map((d) => d.dayProfit)),
    netProfit: closed.netProfit + profitMoved,
    owner: {
      reachedOwner: closed.owner.reachedOwner + onlineMoved,
      netReachedOwner: closed.owner.netReachedOwner + onlineMoved,
      heldByBusiness: closed.owner.heldByBusiness + profitMoved - onlineMoved,
    },
    bonuses: closed.bonuses,
    adjustments: closed.adjustments,
    adjustmentsToOwner: closed.adjustmentsToOwner,
  };
}
