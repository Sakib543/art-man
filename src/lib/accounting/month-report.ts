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
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function buildMonthReport(input: MonthReportInput): MonthReport {
  const sales = sum(input.days.map((d) => d.sale));
  const online = sum(input.days.map((d) => d.online));
  const dailyExpenses = sum(input.days.map((d) => d.expenses));
  const staffEarned = sum(input.days.map((d) => d.staffEarned));
  const expenses = monthlyExpenseTotals(input.monthlyExpenses);

  const profit = netProfit({
    totalSales: sales,
    dailyExpenses,
    monthlyExpenses: expenses.total,
    staffEarnings: staffEarned + input.salaries + input.bonuses,
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
    }),
    capitalRepaid: input.capitalRepaid,
  };
}
