import type { Rupees } from "./types";

/** Partners' profit shares must add up to exactly 100%. */
export function checkShares(percents: number[]): { ok: boolean; total: number } {
  // Rounded so 33.3 + 33.3 + 33.4 is not thrown off by floating point.
  const total = Math.round(percents.reduce((sum, p) => sum + p, 0) * 100) / 100;
  return { ok: total === 100 && percents.every((p) => p >= 0), total };
}

export interface PartnerAccountInput {
  /** This partner's share of the month's net profit. Can be negative in a loss month. */
  profitShare: Rupees;
  /** All the capital this partner has put in (all investments, all time). */
  injected: Rupees;
  /** Capital already paid back to this partner. */
  repaid: Rupees;
  /** Profit the partner took out this month. */
  drawn: Rupees;
}

export interface PartnerAccount extends PartnerAccountInput {
  /** Capital the business still owes this partner. */
  owed: Rupees;
  /** Profit share + capital still owed - drawn: what the business owes the partner. */
  netPosition: Rupees;
}

export function partnerAccount(input: PartnerAccountInput): PartnerAccount {
  const owed = input.injected - input.repaid;
  return { ...input, owed, netPosition: input.profitShare + owed - input.drawn };
}
