import type { KhataEntry, Rupees } from "./types";

/** Running balance: what the staff member is owed (positive) or has taken in advance (negative). */
export function khataBalance(entries: KhataEntry[]): Rupees {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

/** Money taken beyond what was earned. Adjusted against next month. */
export function advanceOutstanding(entries: KhataEntry[]): Rupees {
  return Math.max(0, -khataBalance(entries));
}

/**
 * The khata line that undoes commission when a bill is cancelled.
 * The original earning stays in the ledger; this reversal cancels it.
 */
export function commissionReversal(commission: Rupees): KhataEntry {
  return { kind: "adjustment", amount: -commission };
}
