import { allocate } from "./allocate";
import { checkShares, shareHundredths } from "./partners";
import type { Partner, Rupees } from "./types";

export interface MonthInput {
  totalSales: Rupees;
  /** Sum of the daily snapshots' expenses. */
  dailyExpenses: Rupees;
  /** Rent, bills, supplies and other monthly expenses. */
  monthlyExpenses: Rupees;
  /**
   * Salary + commission + wage + bonus that staff earned.
   * Advances are NOT included: counting them would subtract the same money twice.
   */
  staffEarnings: Rupees;
  /**
   * What adjustments for earlier, closed months do to this month's profit
   * (backlog P3.4). A closed month is never recalculated, so a mistake found in
   * it later is put right here, in the month that is open.
   */
  adjustments?: Rupees;
}

/**
 * Net profit for the month. Cash the owner took from the drawer is not an
 * expense, so it never appears here.
 */
export function netProfit(m: MonthInput): Rupees {
  return m.totalSales - m.dailyExpenses - m.monthlyExpenses - m.staffEarnings + (m.adjustments ?? 0);
}

export interface OwnerAccountInput {
  netProfit: Rupees;
  onlineReceived: Rupees;
  cashTaken: Rupees;
  /** Business costs the owner paid from his own bank, credited back to him. */
  paidFromOwnPocket: Rupees;
  /**
   * Capital paid back to partners this month. It is business cash that has
   * left, so less is held by the business, but it is not an expense.
   */
  capitalRepaid?: Rupees;
  /**
   * The part of this month's adjustments (backlog P3.4) that changes what
   * reached the Owner: online money a corrected sale did or did not bring into
   * his bank, less a corrected cost he paid himself. Their effect on the profit
   * is already in `netProfit`; without this, putting right an online sale would
   * move the balance with the business, though no money in the business moved.
   */
  adjustments?: Rupees;
}

export interface OwnerAccount {
  reachedOwner: Rupees;
  netReachedOwner: Rupees;
  heldByBusiness: Rupees;
}

export function ownerAccount(i: OwnerAccountInput): OwnerAccount {
  const reachedOwner = i.onlineReceived + i.cashTaken;
  const netReachedOwner = reachedOwner - i.paidFromOwnPocket;
  return {
    reachedOwner,
    netReachedOwner,
    heldByBusiness: i.netProfit - netReachedOwner - (i.capitalRepaid ?? 0) - (i.adjustments ?? 0),
  };
}

/**
 * Each partner's share of the net profit. The shares must pass `checkShares`,
 * which every caller asks first; split by hundredths of a percent, as whole
 * numbers (P7.4).
 */
export function partnerShares(profit: Rupees, partners: Partner[]): Record<string, Rupees> {
  const check = checkShares(partners.map((p) => p.sharePct));
  if (!check.ok) throw new Error(`Partner shares must add up to 100%, got ${check.total}%`);

  const parts = allocate(profit, partners.map((p) => shareHundredths(p.sharePct)));
  return Object.fromEntries(partners.map((p, i) => [p.id, parts[i]]));
}

/** A partner's share of a closed month, as Month close saved it in `month_closes.shares`. */
export interface ClosedShare {
  partnerId: string;
  name: string;
  sharePct: number;
  amount: Rupees;
}

/**
 * A closed month's shares for its corrected net profit (backlog P1.10). Each
 * partner keeps the percentage saved at close, not today's, and so does the
 * order: a leftover rupee goes by position on a tie, so the saved order is what
 * makes this the split the close itself would have made.
 */
export function recalculateShares(closed: ClosedShare[], netProfit: Rupees): ClosedShare[] {
  const amounts = partnerShares(netProfit, closed.map((share) => ({ id: share.partnerId, sharePct: share.sharePct })));
  return closed.map((share) => ({ ...share, amount: amounts[share.partnerId] }));
}
