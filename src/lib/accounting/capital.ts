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
