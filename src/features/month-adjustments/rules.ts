import type { AdjustmentKind, PaidFrom, Rupees } from "@/lib/accounting";
import { formatMonth } from "@/lib/business-date";
import { rs } from "@/lib/format";

/**
 * When an adjustment for a closed month may be recorded or cancelled, and how
 * it reads (backlog P3.4). Pure, so the rules can be read in a test without a
 * database.
 */

export interface RecordContext {
  /** The month to be corrected, "2026-09". */
  corrects: string;
  correctsClosed: boolean;
  /** The month of the latest business day, where the adjustment would count. Null before the first day. */
  current: string | null;
  currentClosed: boolean;
}

/** Why an adjustment for `corrects` cannot be recorded now, or null when it can. */
export function recordBlocker(context: RecordContext): string | null {
  const { corrects, current } = context;
  if (current === null) return "No business day has been opened yet.";
  if (!context.correctsClosed) {
    // An open month is corrected in place: a closed day's bill or entry is the
    // Owner's to cancel from the Daily report until the month is closed.
    return `${formatMonth(corrects)} is not closed. A mistake in it is put right in that month, not with an adjustment.`;
  }
  if (context.currentClosed) {
    // Between a month's close and the first day of the next: no month is open.
    return "The next business day has not been started yet. Start it in Day close first: an adjustment counts in the month that day opens.";
  }
  // Months close in order, so a closed month is always earlier than an open
  // one. Kept so a bad request cannot put an adjustment ahead of its month.
  if (corrects >= current) return "An adjustment can only correct an earlier month.";
  return null;
}

export interface CancelContext {
  isCancellation: boolean;
  cancelled: boolean;
  /** The month it counts in, "2026-10". */
  countsIn: string;
  countsInClosed: boolean;
}

/** Why an adjustment cannot be cancelled, or null when it can. */
export function cancelBlocker(context: CancelContext): string | null {
  if (context.isCancellation) return "A cancellation cannot be cancelled.";
  if (context.cancelled) return "This adjustment is already cancelled.";
  if (context.countsInClosed) {
    return `${formatMonth(context.countsIn)} is closed, and this adjustment with it. Record another adjustment instead.`;
  }
  return null;
}

/** More than recorded is +, less is -: how the closed month's figure should have read. */
export const signedAmount = (direction: "more" | "less", amount: Rupees): Rupees => (direction === "more" ? amount : -amount);

/** The staff khata line written with an adjustment to someone's pay. The reason is the Owner's own words. */
export const khataLabel = (correctsMonth: string, reason: string): string =>
  `Adjustment for ${formatMonth(correctsMonth)}: ${reason.trim()}`;

/** The khata line that takes it back out when the adjustment is cancelled. */
export const khataCancelLabel = (correctsMonth: string, reason: string): string =>
  `Adjustment for ${formatMonth(correctsMonth)} cancelled: ${reason.trim()}`;

export interface Described {
  kind: AdjustmentKind;
  amount: Rupees;
  online: boolean | null;
  paidFrom: PaidFrom | null;
  staffName: string | null;
}

/** What an adjustment says, in one line: "Sales were Rs 1,000 less than recorded (online)". */
export function describeAdjustment(adjustment: Described): string {
  const much = rs(Math.abs(adjustment.amount));
  const way = adjustment.amount >= 0 ? "more" : "less";
  const who = adjustment.staffName ?? "A staff member";
  switch (adjustment.kind) {
    case "sale":
      return `Sales were ${much} ${way} than recorded (${adjustment.online ? "online" : "cash"})`;
    case "expense":
      return `Expenses were ${much} ${way} than recorded${adjustment.paidFrom === "owner" ? " (paid by the Owner)" : ""}`;
    case "staff_earning":
      return `${who} earned ${much} ${way} than recorded`;
    case "staff_taken":
      return `${who} took ${much} ${way} than recorded`;
  }
}

/** The choices on the form, in the words the Owner would use. */
export const KIND_CHOICES: readonly { value: AdjustmentKind; label: string; hint: string }[] = [
  {
    value: "sale",
    label: "A sale (a bill)",
    hint: "A bill was charged or entered wrong. If a staff member's commission was wrong with it, add that as well, as what they earned.",
  },
  {
    value: "expense",
    label: "An expense",
    hint: "A daily or a monthly expense was entered wrong, or left out.",
  },
  {
    value: "staff_earning",
    label: "What a staff member earned",
    hint: "Commission, daily wage, salary or bonus. It goes in their khata too.",
  },
  {
    value: "staff_taken",
    label: "What a staff member took",
    hint: "An advance or a payment was recorded wrong. Only their khata changes: money taken is not a cost.",
  },
];

/** "The sales were" / "They earned" — the question the more-or-less choice answers. */
export function directionQuestion(kind: AdjustmentKind, staffName: string | null): string {
  const who = staffName ?? "They";
  switch (kind) {
    case "sale":
      return "The sales were";
    case "expense":
      return "The expense was";
    case "staff_earning":
      return `${who} earned`;
    case "staff_taken":
      return `${who} took`;
  }
}

/** Is it about a staff member's pay, and so written into their khata too? */
export const isStaffKind = (kind: AdjustmentKind): boolean => kind === "staff_earning" || kind === "staff_taken";

/** What an adjustment recorded by a developer account is shown as recorded by. */
export const SYSTEM = "System";

/**
 * Who the Monthly report says recorded an adjustment. A developer's account is
 * shown as "System": the Owner and the Manager are not shown that the role
 * exists (HANDOFF section 6, the user's decision of 2026-09-30). Never another
 * person's name — that would put a money entry on someone who did not make it.
 * The real name stays in the row and in the audit log.
 *
 * `developerNames` holds every name a developer account has signed with, lower
 * case: a renamed account's old adjustments carry its old name.
 */
export function recordedBy(createdBy: string, developerNames: ReadonlySet<string>): string {
  return developerNames.has(createdBy.trim().toLowerCase()) ? SYSTEM : createdBy;
}
