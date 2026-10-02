import { formatHours, type KhataKind, type Rupees } from "@/lib/accounting";
import { rs } from "@/lib/format";

/**
 * When a bonus (backlog P3.1), overtime or a deduction (P3.18) may be added,
 * when one may be cancelled, and what their ledger lines say. Pure, so the
 * same rules can be read in a test without a database.
 */

export interface BonusContext {
  /** Somebody who has left the salon is not given a bonus by mistake. */
  active: boolean;
  /**
   * A closed month's report and the partners' shares were frozen at close, and
   * a bonus is a cost that would change both. It belongs in the open month.
   */
  monthClosed: boolean;
}

/** What is wrong with giving this bonus, or null when nothing is. */
export function checkBonus(context: BonusContext): string | null {
  if (!context.active) return "That staff member is no longer active.";
  if (context.monthClosed) return "This month is closed. Give the bonus in the next month.";
  return null;
}

/** The line the khata shows. The reason is the Owner's own words. */
export const bonusLabel = (reason: string): string => `Bonus: ${reason.trim()}`;

/** What is wrong with adding overtime, or null when nothing is. Its rate is the Owner's to set. */
export function checkOvertime(context: BonusContext & { rate: Rupees }): string | null {
  if (!context.active) return "That staff member is no longer active.";
  if (context.monthClosed) return "This month is closed. Add the overtime in the next month.";
  if (context.rate <= 0) return "No overtime rate is set for them. The Owner sets it on Staff & rates.";
  return null;
}

/**
 * What is wrong with taking a deduction off, or null when nothing is. Someone
 * who has left may still owe for something, so they can be.
 */
export function checkDeduction(context: Pick<BonusContext, "monthClosed">): string | null {
  return context.monthClosed ? "This month is closed. Take the deduction off in the next month." : null;
}

/** "Overtime 3 h × Rs 150: Stayed for the wedding party". */
export const overtimeLabel = (hours: number, rate: Rupees, reason: string): string =>
  `Overtime ${formatHours(hours)} × ${rs(rate)}: ${reason.trim()}`;

/** "Deduction: Late two hours". */
export const deductionLabel = (reason: string): string => `Deduction: ${reason.trim()}`;

/**
 * The khata lines the Owner may cancel from the ledger (P3.18). Everything else
 * is put right where it was made: a day's earnings by reopening or correcting
 * the day, a payment or an advance in Daily folders.
 */
export const cancellableKinds: readonly KhataKind[] = ["overtime", "deduction"];

export interface CancelContext {
  kind: KhataKind;
  /** The line is itself a cancellation. */
  isCancellation: boolean;
  alreadyCancelled: boolean;
  /** The line's own month, which its cancellation is dated in too. */
  monthClosed: boolean;
}

/** What is wrong with cancelling this khata line, or null when nothing is. */
export function checkCancel(context: CancelContext): string | null {
  if (!cancellableKinds.includes(context.kind) || context.isCancellation) return "Only overtime and deductions can be cancelled here.";
  if (context.alreadyCancelled) return "This line has already been cancelled.";
  if (context.monthClosed) return "Its month is closed. Put it right with an adjustment, from the Monthly report.";
  return null;
}

/** "Cancelled: Deduction: Late two hours (wrong person)". The original line stays above it. */
export const cancelledLabel = (label: string, reason: string): string => `Cancelled: ${label} (${reason.trim()})`;
