import type { LastVisit, LastVisitLine } from "./types";

/**
 * Turning a customer's most recent bill into what the counter sees (backlog
 * P3.8). Pure, so it can be tested without a database — which matters here
 * because the total shown to the counter must always be the total of the lines
 * shown right above it.
 *
 * Which bill counts as the last visit is decided in SQL, not here: a reversal
 * bill and a cancelled bill are excluded before these rows are loaded.
 */

/** A bill row, as much of it as the last-visit strip needs. */
export interface VisitBill {
  billNo: number;
  businessDate: string;
}

/**
 * Build the last visit from its bill and its lines. Returns null when the
 * customer has no bill that counts — a new customer, or one whose only bill
 * was cancelled.
 *
 * The total is summed from the lines rather than read from the bill's
 * `cash + online`. The two always agree, but summing what is on screen means
 * they cannot ever disagree *on screen*.
 */
export function lastVisitOf(bill: VisitBill | null, lines: LastVisitLine[]): LastVisit | null {
  if (!bill) return null;
  return {
    billNo: bill.billNo,
    businessDate: bill.businessDate,
    total: lines.reduce((sum, line) => sum + line.amount, 0),
    lines,
  };
}

/**
 * "3 visits" / "1 visit" / "No visits yet". The count excludes cancelled bills,
 * so a customer who exists can legitimately have none.
 */
export function visitLabel(visits: number): string {
  if (visits <= 0) return "No visits yet";
  return visits === 1 ? "1 visit" : `${visits} visits`;
}
