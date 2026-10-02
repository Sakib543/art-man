import { leaverSalary, type Rupees } from "@/lib/accounting";
import { formatMonth, lastDateOfMonth, monthOf } from "@/lib/business-date";
import { formatDayMonth } from "@/lib/format";

/**
 * What making a karigar inactive settles (backlog P3.19, the client's
 * decision of 2026-10-02): someone on a monthly salary who leaves before the
 * month is over is paid it for the days they were present, and Month close —
 * which pays only the staff still active — never pays them that month again.
 * Pure, so it is read in a test without a database.
 */

export interface LeaverContext {
  /** Their pay has a monthly salary, as it stood before this change. */
  salaried: boolean;
  salary: Rupees;
  /** The last working day the Owner picked. */
  lastDay: string;
  /** The latest business day that is closed; null when none is. */
  latestClosedDay: string | null;
  /** Has the last day's month been closed already? */
  lastDayMonthClosed: boolean;
  /** The earliest month with business days that is not closed yet; null when every one is. */
  earliestOpenMonth: string | null;
  /** Days marked present at Day close, from the 1st of the last day's month to the last day itself. */
  daysPresent: number;
}

export type LeaverSettlement =
  | { kind: "pay"; month: string; daysPresent: number; daysInMonth: number; amount: Rupees }
  | { kind: "none"; note: string }
  | { kind: "refuse"; problem: string };

export function settleLeaver(context: LeaverContext): LeaverSettlement {
  if (!context.salaried) return { kind: "none", note: "No monthly salary to settle." };
  // Nothing has been closed, so nobody has been marked present: nothing is owed.
  if (context.latestClosedDay === null) return { kind: "none", note: "No business day has been closed yet, so no salary is owed." };
  // A day still open has no attendance yet; counting it would be guessing.
  if (context.lastDay > context.latestClosedDay) {
    return {
      kind: "refuse",
      problem: `Choose a day that is already closed: ${formatDayMonth(context.latestClosedDay)} or before. If they worked today, close the day first.`,
    };
  }

  const month = monthOf(context.lastDay);
  if (context.lastDayMonthClosed) {
    return { kind: "none", note: `${formatMonth(month)} was closed with their full salary, so nothing more is added.` };
  }
  // An earlier month still open would be closed without them — inactive by
  // then — and pay them nothing for a month they worked in full.
  if (context.earliestOpenMonth !== null && context.earliestOpenMonth < month) {
    return { kind: "refuse", problem: `Close ${formatMonth(context.earliestOpenMonth)} first: their salary for it is added when it closes.` };
  }

  const daysInMonth = Number(lastDateOfMonth(month).slice(8));
  return {
    kind: "pay",
    month,
    daysPresent: context.daysPresent,
    daysInMonth,
    amount: leaverSalary(context.salary, context.daysPresent, daysInMonth),
  };
}

/** What the Staff & rates form says before the Save: the sum, or why there is none. */
export function settlementText(settlement: LeaverSettlement, salary: Rupees): string {
  if (settlement.kind === "refuse") return settlement.problem;
  if (settlement.kind === "none") return settlement.note;
  const { month, daysPresent, daysInMonth, amount } = settlement;
  return `${formatMonth(month)}: ${daysPresent} of ${daysInMonth} days present. ${salary.toLocaleString("en-US")} × ${daysPresent} ÷ ${daysInMonth} = Rs ${amount.toLocaleString("en-US")} goes into their khata.`;
}
