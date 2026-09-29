import { allocate } from "./allocate";
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

/** Each partner's share of the net profit. Shares must add up to 100%. */
export function partnerShares(profit: Rupees, partners: Partner[]): Record<string, Rupees> {
  const pctTotal = partners.reduce((sum, p) => sum + p.sharePct, 0);
  if (pctTotal !== 100) throw new Error(`Partner shares must add up to 100%, got ${pctTotal}%`);

  const parts = allocate(profit, partners.map((p) => p.sharePct));
  return Object.fromEntries(partners.map((p, i) => [p.id, parts[i]]));
}
