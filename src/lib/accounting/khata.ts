import type { Rupees } from "./types";

/**
 * Each entry with the balance after it, in the order given, starting from
 * `opening` — what was brought forward when the entries are one month of a
 * longer account (Staff khata, P7.15).
 */
export function withRunningBalance<T extends { amount: Rupees }>(entries: T[], opening: Rupees = 0): (T & { balance: Rupees })[] {
  let balance = opening;
  return entries.map((entry) => {
    balance += entry.amount;
    return { ...entry, balance };
  });
}

