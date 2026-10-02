/**
 * When a bonus may be given, and what its ledger line says. Pure, so the same
 * rules can be read in a test without a database (backlog P3.1).
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
