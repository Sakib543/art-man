import { dayEarning, workByStaff, type DayEarning } from "./commission";
import { dayProfit, expectedCash, salesTotals } from "./day";
import { folderTotals, type FolderEntry, type FolderTotals } from "./folders";
import type { Bill, Rupees, StaffPay } from "./types";

/**
 * Everything Day Close works out, in one pure function. The server calls it
 * with figures read from the database; nothing the browser sends is trusted.
 */

export interface CloseStaff {
  id: string;
  pay: StaffPay;
  /** Marked at Day Close. Only daily-wage staff get paid for being present. */
  present: boolean;
}

export interface DayCloseInput {
  /** Yesterday's leftover, carried over automatically. */
  openingCash: Rupees;
  /** All of the day's bills, including cancelled ones and their reversals. */
  bills: Bill[];
  /** Folder entries made during the day, BEFORE the payments made at close. */
  entries: FolderEntry[];
  staff: CloseStaff[];
  /** Cash handed to staff at close, by staff id. */
  payouts: Record<string, Rupees>;
}

export interface DayCloseSummary {
  cash: Rupees;
  online: Rupees;
  sale: Rupees;
  /** Earned today (commission + daily wage) by staff id. Includes staff who earned nothing. */
  earnings: Record<string, DayEarning>;
  staffEarned: Rupees;
  /** Advances taken during the day plus payments made at close. */
  staffPaid: Rupees;
  payoutsTotal: Rupees;
  folders: FolderTotals;
  /** Drawer expenses plus expenses the owner paid himself. */
  expenses: Rupees;
  expectedCash: Rupees;
  /** Sale - expenses - staff earnings. Advances and owner cash are not expenses. */
  dayProfit: Rupees;
}

export function summarizeDay(input: DayCloseInput): DayCloseSummary {
  const { cash, online, sale } = salesTotals(input.bills);
  const work = workByStaff(input.bills);

  const earnings: Record<string, DayEarning> = {};
  for (const member of input.staff) {
    earnings[member.id] = dayEarning(member.pay, work[member.id] ?? 0, member.present);
  }
  const staffEarned = Object.values(earnings).reduce((sum, e) => sum + e.total, 0);

  const folders = folderTotals(input.entries, online);
  const payoutsTotal = Object.values(input.payouts).reduce((sum, amount) => sum + amount, 0);
  const expenses = folders.expensesFromDrawer + folders.expensesFromOwner;

  return {
    cash,
    online,
    sale,
    earnings,
    staffEarned,
    staffPaid: folders.staffAdvances + folders.staffPayments + payoutsTotal,
    payoutsTotal,
    folders,
    expenses,
    expectedCash: expectedCash({
      openingCash: input.openingCash,
      cashSales: cash,
      ownerAdded: folders.ownerAdded,
      expensesFromDrawer: folders.expensesFromDrawer,
      staffAdvances: folders.staffAdvances,
      staffPayments: folders.staffPayments + payoutsTotal,
      ownerTook: folders.ownerTook,
    }),
    dayProfit: dayProfit({ sale, expenses, staffEarned }),
  };
}

export interface BreakdownRow {
  label: string;
  /** Positive adds to the drawer, negative takes from it. */
  amount: Rupees;
}

/** The lines that add up to expected cash, in the order the screen shows them. */
export function expectedCashBreakdown(openingCash: Rupees, summary: DayCloseSummary): BreakdownRow[] {
  return [
    { label: "Opening cash (from yesterday)", amount: openingCash },
    { label: "Cash sales", amount: summary.cash },
    { label: "Owner added cash", amount: summary.folders.ownerAdded },
    { label: "Expenses from drawer", amount: -summary.folders.expensesFromDrawer },
    { label: "Staff advances", amount: -summary.folders.staffAdvances },
    { label: "Staff payments today", amount: -(summary.folders.staffPayments + summary.payoutsTotal) },
    { label: "Owner took cash", amount: -summary.folders.ownerTook },
  ];
}
