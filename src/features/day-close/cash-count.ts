import { countedTotal, type Rupees } from "@/lib/accounting";
import { parseRupees } from "@/lib/format";

/**
 * The drawer counted note by note (P7.18, QA-15; spec §5.4(4): "Manager enters
 * notes by denomination — 5000 × n, 1000 × n …"). The count step took one
 * total only; this adds the notes up into it. The total is still what is
 * saved and compared with expected cash — the notes are a way to reach it.
 *
 * Pure: the screen keeps what was typed, this reads it.
 */

/** The notes a drawer holds, largest first. Coins are counted as one amount. */
export const NOTES = [5000, 1000, 500, 100, 50, 20, 10] as const;

export type NoteCounts = Partial<Record<(typeof NOTES)[number], string>>;

export type CashCount = { ok: true; total: Rupees } | { ok: false; problem: string };

/**
 * The drawer's total from how many of each note and the coins, as typed — or
 * what is wrong with it. A blank box is none; a count must be a whole number,
 * and the coins whole rupees, read as strictly as every money box (P7.5).
 */
export function cashCountOf(notes: NoteCounts, coins: string): CashCount {
  const counted: Record<number, number> = {};
  for (const note of NOTES) {
    const count = parseRupees(notes[note]);
    if (count === null) return { ok: false, problem: `Write how many Rs ${note.toLocaleString("en-US")} notes as a whole number.` };
    if (count > 0) counted[note] = count;
  }
  const loose = parseRupees(coins);
  if (loose === null) return { ok: false, problem: "Write the coins in whole rupees." };
  return { ok: true, total: countedTotal(counted) + loose };
}
