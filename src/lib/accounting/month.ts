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
}

/**
 * Net profit for the month. Cash the owner took from the drawer is not an
 * expense, so it never appears here.
 */
export function netProfit(m: MonthInput): Rupees {
  return m.totalSales - m.dailyExpenses - m.monthlyExpenses - m.staffEarnings;
}

export interface OwnerAccountInput {
  netProfit: Rupees;
  onlineReceived: Rupees;
  cashTaken: Rupees;
  /** Business costs the owner paid from his own bank, credited back to him. */
  paidFromOwnPocket: Rupees;
}

export interface OwnerAccount {
  reachedOwner: Rupees;
  netReachedOwner: Rupees;
  heldByBusiness: Rupees;
}

export function ownerAccount(i: OwnerAccountInput): OwnerAccount {
  const reachedOwner = i.onlineReceived + i.cashTaken;
  const netReachedOwner = reachedOwner - i.paidFromOwnPocket;
  return { reachedOwner, netReachedOwner, heldByBusiness: i.netProfit - netReachedOwner };
}

/** Each partner's share of the net profit. Shares must add up to 100%. */
export function partnerShares(profit: Rupees, partners: Partner[]): Record<string, Rupees> {
  const pctTotal = partners.reduce((sum, p) => sum + p.sharePct, 0);
  if (pctTotal !== 100) throw new Error(`Partner shares must add up to 100%, got ${pctTotal}%`);

  const parts = allocate(profit, partners.map((p) => p.sharePct));
  return Object.fromEntries(partners.map((p, i) => [p.id, parts[i]]));
}
