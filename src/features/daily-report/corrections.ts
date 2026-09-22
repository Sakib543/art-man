import type { DayBill } from "@/db/queries/day-bills";

/**
 * Folding an Owner's correction into one line (P1.5). Pure — no React, no
 * database — so it is easy to test.
 *
 * P1.4 records a correction as three rows: the original bill cancelled, a
 * reversal that undoes its amounts, and the corrected bill. That is the honest
 * record and it stays in the database untouched. The client asked for the
 * Daily report to show the day as one line per bill, so the two older rows are
 * folded into the newest one and reachable from it.
 *
 * Nothing is hidden from the totals: a cancelled bill and its reversal add up
 * to zero, so the visible rows sum to exactly what every row summed to before.
 */

export interface ReportBill extends DayBill {
  /** Earlier versions of this bill, newest first. Empty unless it was corrected. */
  previous: DayBill[];
}

export function foldCorrections(bills: DayBill[]): ReportBill[] {
  const byId = new Map(bills.map((bill) => [bill.id, bill]));

  /** The original of each correction, and the reversal that undid it. */
  const folded = new Set<string>();
  for (const bill of bills) {
    if (!bill.supersedesBillId) continue;
    folded.add(bill.supersedesBillId);
    for (const other of bills) {
      if (other.reversesBillId === bill.supersedesBillId) folded.add(other.id);
    }
  }

  return bills
    .filter((bill) => !folded.has(bill.id))
    .map((bill) => ({ ...bill, previous: versionsBefore(bill, byId) }));
}

/** Walk back the chain of corrections, newest first. A bill can be corrected more than once. */
function versionsBefore(bill: DayBill, byId: Map<string, DayBill>): DayBill[] {
  const chain: DayBill[] = [];
  const seen = new Set<string>([bill.id]);

  let id = bill.supersedesBillId;
  while (id && !seen.has(id)) {
    const previous = byId.get(id);
    if (!previous) break;
    chain.push(previous);
    seen.add(id);
    id = previous.supersedesBillId;
  }

  return chain;
}

/** The reason an earlier version was replaced, without the prefix `editBill` stores. */
export function editReason(version: DayBill): string | null {
  if (!version.cancelReason) return null;
  return version.cancelReason.replace(/^Edited:\s*/, "");
}
