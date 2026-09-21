import type { Bill, Rupees } from "./types";

/** Totals for a day's bills. Cancelled bills and their reversals net to zero. */
export function salesTotals(bills: Bill[]): { cash: Rupees; online: Rupees; sale: Rupees } {
  let cash = 0;
  let online = 0;
  for (const bill of bills) {
    cash += bill.cash;
    online += bill.online;
  }
  return { cash, online, sale: cash + online };
}

export interface CashMovements {
  openingCash: Rupees;
  cashSales: Rupees;
  ownerAdded: Rupees;
  /** Expenses paid from the drawer only (not ones the owner paid himself). */
  expensesFromDrawer: Rupees;
  staffAdvances: Rupees;
  /** Commission / wage / bonus / salary handed to staff. */
  staffPayments: Rupees;
  ownerTook: Rupees;
}

/**
 * Cash that should be in the drawer at night. Online payments are not here
 * because they go straight to the owner's bank.
 */
export function expectedCash(m: CashMovements): Rupees {
  return (
    m.openingCash +
    m.cashSales +
    m.ownerAdded -
    m.expensesFromDrawer -
    m.staffAdvances -
    m.staffPayments -
    m.ownerTook
  );
}

export interface CashDifference {
  difference: Rupees;
  kind: "match" | "short" | "extra";
  /** Short cash needs a reason before the day can close. */
  reasonRequired: boolean;
}

/** Counted minus expected. Negative = short, positive = extra. */
export function cashDifference(counted: Rupees, expected: Rupees): CashDifference {
  const difference = counted - expected;
  const kind = difference === 0 ? "match" : difference < 0 ? "short" : "extra";
  return { difference, kind, reasonRequired: kind === "short" };
}

/** Total of a denomination count, e.g. { 5000: 2, 1000: 3 } = 13,000. */
export function countedTotal(notes: Record<number, number>): Rupees {
  return Object.entries(notes).reduce((sum, [note, qty]) => sum + Number(note) * qty, 0);
}

export interface DayProfitInput {
  sale: Rupees;
  expenses: Rupees;
  /** What staff earned (commission + wage + bonus). Not what they withdrew. */
  staffEarned: Rupees;
}

export function dayProfit({ sale, expenses, staffEarned }: DayProfitInput): Rupees {
  return sale - expenses - staffEarned;
}
