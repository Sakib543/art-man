import { createHash } from "node:crypto";

/**
 * The security code a day closes with. It is a hash of the day's figures and
 * the drawer's reason, the day's bills and entries, its staff list with the
 * pay it was settled on, and the previous day's code. If anything from a
 * closed day is changed later, recomputing gives a different code.
 */

/** JSON with keys sorted, so the same data always produces the same text. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** Used as the "previous code" for the very first day. */
export const FIRST_DAY_CODE = "FIRST-DAY";

/** One line of a bill, as the code covers it. */
export interface SealedLine {
  name: string;
  amount: number;
  staffId: string;
}

/** One bill, as the code covers it. */
export interface SealedBill {
  billNo: number;
  cash: number;
  online: number;
  customerId: string | null;
  reversesBillId: string | null;
  lines: SealedLine[];
  /** Covered since P7.14 (QA-12): the discount and its reason, the paper slip's number, why it was cancelled. */
  discount: number;
  discountReason: string | null;
  bookNo: string | null;
  cancelReason: string | null;
}

/** One row of the day's staff list (`attendance`), as the code covers it since P7.14. */
export interface SealedAttendance {
  staffId: string;
  present: boolean;
  /** The pay the day was settled on (P7.3); null on a day closed before then. */
  payType: number | null;
  salary: number | null;
  dailyWage: number | null;
  commissionRate: number | null;
}

export interface SecurityCodeInput {
  previousCode: string;
  businessDate: string;
  /** The day's headline figures (sale, expected, counted...). */
  figures: Record<string, number | string | null>;
  /** Why the drawer was short or over, as written at the close. Covered since P7.14. */
  diffReason: string | null;
  /** The day's bills with their lines, in bill-number order. The lines may come in any order. */
  bills: SealedBill[];
  /** The day's folder entries, in creation order. */
  entries: unknown;
  /** The day's staff list, in any order. Covered since P7.14. */
  attendance: SealedAttendance[];
}

const compare = (a: string | number, b: string | number) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * A bill's lines in one fixed order: by name, then amount, then staff member
 * (P7.8, QA-27). `bill_lines` has no order of its own, and the database hands
 * them back in whatever order its plan finds them — the same day gave two
 * different codes under two plans, and rewriting a line unchanged moved it.
 * Sorting by what is hashed makes the order part of the data: two lines alike
 * in all three are interchangeable. Compared by code unit, never by locale,
 * so every computer sorts them alike.
 */
function inFixedOrder(lines: readonly SealedLine[]): SealedLine[] {
  return [...lines].sort((a, b) => compare(a.name, b.name) || compare(a.amount, b.amount) || compare(a.staffId, b.staffId));
}

/** "A3F9-7C21-0B8E": 12 hex characters, easy to read out and compare. */
function codeOf(value: unknown): string {
  const hex = createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 12).toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

/**
 * The code a day is sealed with now. Since P7.14 (QA-12) it covers, besides
 * the figures, bills and entries, what a closed day could be changed in
 * without it showing: a bill's discount, discount reason, slip number and
 * cancellation reason, the drawer's reason, and the staff list with the pay
 * the day is settled on — the attendance a correction re-settles from.
 */
export function computeSecurityCode(input: SecurityCodeInput): string {
  return codeOf({
    ...input,
    bills: input.bills.map((bill) => ({ ...bill, lines: inFixedOrder(bill.lines) })),
    attendance: [...input.attendance].sort((a, b) => compare(a.staffId, b.staffId)),
  });
}

/** What a code covered before P7.14: the figures, the bills' money and lines, the entries. */
function coveredBeforeP714(input: SecurityCodeInput, lines: (lines: readonly SealedLine[]) => SealedLine[]) {
  return {
    previousCode: input.previousCode,
    businessDate: input.businessDate,
    figures: input.figures,
    bills: input.bills.map((bill) => ({
      billNo: bill.billNo,
      cash: bill.cash,
      online: bill.online,
      customerId: bill.customerId,
      reversesBillId: bill.reversesBillId,
      lines: lines(bill.lines),
    })),
    entries: input.entries,
  };
}

/**
 * The code as it was worked out from P7.8 to P7.14, without what P7.14 added.
 * A day sealed then is checked on it (`inspectDays`): its code covers what it
 * covered, and was never meant to cover the rest. Days sealed since are checked
 * on `computeSecurityCode` — this cannot give their code, which covered more.
 */
export function securityCodeBeforeP714(input: SecurityCodeInput): string {
  return codeOf(coveredBeforeP714(input, inFixedOrder));
}

/**
 * The code as it was worked out before P7.8: a bill's lines in the order they
 * are given. Only to tell a day sealed that way — whose records are as they
 * were — from one whose records changed, before it is sealed again in the
 * fixed order (`resealOldDays`).
 */
export function securityCodeAsBefore(input: SecurityCodeInput): string {
  return codeOf(coveredBeforeP714(input, (lines) => [...lines]));
}
