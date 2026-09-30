import type { DayEarning, Rupees } from "@/lib/accounting";
import { parseRupees, rs } from "@/lib/format";
import type { CloseStaffRow } from "./types";

/**
 * Step 3 of Day close, the cash handed to staff, checked before the count
 * (backlog P7.5, QA-29). Pure: the wizard asks, this answers.
 */

export interface OverOwed {
  name: string;
  paid: Rupees;
  /** Their khata balance plus what they earned today: what they are owed after today. */
  owed: Rupees;
}

export type PayoutsCheck =
  | { ok: false; problem: string }
  | { ok: true; amounts: Record<string, Rupees>; overOwed: OverOwed[] };

/**
 * Every "Paid today" box as whole rupees, or the first that is not, in words —
 * never cut down quietly (QA-14). And who is being paid more than they are
 * owed: not refused, since a payment can be an advance, but asked about, as
 * typing into a pre-filled 1,110 once made Rs 11,101,110.
 */
export function checkPayouts(
  staff: readonly CloseStaffRow[],
  earnings: Record<string, DayEarning>,
  payouts: Record<string, string>,
): PayoutsCheck {
  const amounts: Record<string, Rupees> = {};
  const overOwed: OverOwed[] = [];
  for (const row of staff) {
    const paid = parseRupees(payouts[row.id]);
    if (paid === null) return { ok: false, problem: `Enter what was paid to ${row.name} in whole rupees, e.g. 700.` };
    amounts[row.id] = paid;
    const owed = row.khataBalance + (earnings[row.id]?.total ?? 0);
    if (paid > 0 && paid > owed) overOwed.push({ name: row.name, paid, owed });
  }
  return { ok: true, amounts, overOwed };
}

/** The question asked before paying someone more than they are owed. */
export function overOwedText(over: readonly OverOwed[]): string {
  const each = over.map(({ name, paid, owed }) => `${name} is being paid ${rs(paid)} but is owed ${owed > 0 ? rs(owed) : "nothing"}`);
  return `${each.join("; ")}. Check the amount, or press Continue again to pay it: the difference stays in the khata as money taken.`;
}
