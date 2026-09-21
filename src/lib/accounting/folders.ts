import type { Rupees } from "./types";

/** The daily folders. Online money lives on bills; the rest are cash entries. */

export type FolderKind = "expense" | "staff_advance" | "staff_payment" | "owner_took" | "owner_added";
export type PaidFrom = "drawer" | "owner";

export interface FolderEntry {
  kind: FolderKind;
  /** Negative on a void row, so a voided entry and its void add up to zero. */
  amount: Rupees;
  paidFrom: PaidFrom | null;
}

export interface FolderTotals {
  /** Expenses paid from the cash drawer: these reduce the drawer. */
  expensesFromDrawer: Rupees;
  /** Expenses the owner paid himself: these never touch the drawer. */
  expensesFromOwner: Rupees;
  staffAdvances: Rupees;
  staffPayments: Rupees;
  ownerTook: Rupees;
  ownerAdded: Rupees;
  /** Online sales go straight to the owner's bank and never enter the drawer. */
  onlineSales: Rupees;
}

export function folderTotals(entries: FolderEntry[], onlineSales: Rupees): FolderTotals {
  const totals: FolderTotals = {
    expensesFromDrawer: 0,
    expensesFromOwner: 0,
    staffAdvances: 0,
    staffPayments: 0,
    ownerTook: 0,
    ownerAdded: 0,
    onlineSales,
  };

  for (const entry of entries) {
    switch (entry.kind) {
      case "expense":
        // An expense with no "paid from" is treated as coming from the drawer.
        if (entry.paidFrom === "owner") totals.expensesFromOwner += entry.amount;
        else totals.expensesFromDrawer += entry.amount;
        break;
      case "staff_advance":
        totals.staffAdvances += entry.amount;
        break;
      case "staff_payment":
        totals.staffPayments += entry.amount;
        break;
      case "owner_took":
        totals.ownerTook += entry.amount;
        break;
      case "owner_added":
        totals.ownerAdded += entry.amount;
        break;
    }
  }
  return totals;
}
