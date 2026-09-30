import type { Rupees } from "./types";

/**
 * A share in hundredths of a percent: 33.33% is 3,333. Two decimals is all
 * `partners.share_pct` keeps (numeric(5,2)), so a stored share is always a
 * whole number of these, and shares are added and compared as whole numbers
 * (P7.4) — added as floats, 0.01 + 65.4 + 34.59 comes to 100.00000000000001.
 */
export const shareHundredths = (pct: number): number => Math.round(pct * 100);

/** At most two decimals, as the column keeps a share: 33.33 is one, 33.333 is not. */
export const hasShareDecimals = (pct: number): boolean => Math.abs(pct * 100 - shareHundredths(pct)) < 1e-6;

/**
 * Partners' profit shares must add up to exactly 100%, none negative, each to
 * at most two decimals. The one check the Partners screen, its Save, Month
 * close and `partnerShares` all use (P7.4), so none of them can accept shares
 * another refuses — before, the screen's check rounded and `partnerShares`
 * did not, and the Partners page fell over on shares the Save had taken.
 */
export function checkShares(percents: number[]): { ok: boolean; total: number } {
  const parts = percents.map(shareHundredths);
  const sum = parts.reduce((total, part) => total + part, 0);
  return {
    ok: sum === 10_000 && parts.every((part) => part >= 0) && percents.every(hasShareDecimals),
    total: sum / 100,
  };
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
