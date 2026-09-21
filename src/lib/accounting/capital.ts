import type { Rupees } from "./types";

export interface CapitalSummary {
  total: Rupees;
  paid: Rupees;
  remaining: Rupees;
}

/**
 * A partner-funded investment (e.g. solar) is capital, not an expense, so it
 * never reduces net profit. It is a liability repaid to the partner in
 * installments.
 */
export function capitalSummary(totalCost: Rupees, repayments: Rupees[]): CapitalSummary {
  const paid = repayments.reduce((sum, r) => sum + r, 0);
  return { total: totalCost, paid, remaining: totalCost - paid };
}

export interface FunderPosition {
  contributed: Rupees;
  repaid: Rupees;
  /** What the business still owes this partner for this investment. */
  remaining: Rupees;
}

export function funderPosition(contributed: Rupees, repayments: Rupees[]): FunderPosition {
  const repaid = repayments.reduce((sum, r) => sum + r, 0);
  return { contributed, repaid, remaining: contributed - repaid };
}

/** Everyone's contributions must add up to the investment's total cost. */
export function contributionsMatch(totalCost: Rupees, contributions: Rupees[]): { ok: boolean; difference: Rupees } {
  const difference = totalCost - contributions.reduce((sum, c) => sum + c, 0);
  return { ok: totalCost > 0 && difference === 0, difference };
}
