import type { PaidFrom } from "./folders";
import type { Rupees } from "./types";

/**
 * An adjustment: a correction to a month that is already closed (backlog P3.4,
 * spec §7.4). The closed month stays exactly as it was closed — its report and
 * the partners' shares were saved then, and may already have been paid out —
 * so the correction counts in the month it is recorded in.
 *
 * `amount` says how the closed month's own figure should have read: +1,000 on
 * a sale means its sales were Rs 1,000 more than recorded, -1,000 that they
 * were Rs 1,000 less. A cancellation is the same adjustment with its sign
 * turned, so the two add up to nothing, whatever the kind.
 */
export type AdjustmentKind = "sale" | "expense" | "staff_earning" | "staff_taken";

export interface Adjustment {
  kind: AdjustmentKind;
  amount: Rupees;
  /** A sale only: was the money paid online, into the Owner's bank? */
  online?: boolean | null;
  /** An expense only: did the business pay it, or the Owner from his own pocket? */
  paidFrom?: PaidFrom | null;
}

export interface AdjustmentEffect {
  /** On the net profit of the month it counts in. */
  profit: Rupees;
  /** On the online money that reached the Owner's bank. */
  online: Rupees;
  /** On the costs the Owner paid himself, which are credited back to him. */
  paidByOwner: Rupees;
  /** On the staff member's khata balance: + owed to them, - taken by them. */
  khata: Rupees;
}

const NONE: AdjustmentEffect = { profit: 0, online: 0, paidByOwner: 0, khata: 0 };

/** What one adjustment changes, and where. */
export function adjustmentEffect(adjustment: Adjustment): AdjustmentEffect {
  const { amount } = adjustment;
  switch (adjustment.kind) {
    case "sale":
      return { ...NONE, profit: amount, online: adjustment.online ? amount : 0 };
    case "expense":
      return { ...NONE, profit: -amount, paidByOwner: adjustment.paidFrom === "owner" ? amount : 0 };
    case "staff_earning":
      // Commission, wage, salary and bonus are staff pay, which the profit is after.
      return { ...NONE, profit: -amount, khata: amount };
    case "staff_taken":
      // An advance or a payment moves cash to the staff member; it is not a
      // cost (spec §7.1), so only their khata moves.
      return { ...NONE, khata: -amount };
  }
}

export interface AdjustmentTotals {
  profit: Rupees;
  online: Rupees;
  paidByOwner: Rupees;
}

/** The adjustments counted in one month, added up for its report. */
export function adjustmentTotals(adjustments: Adjustment[]): AdjustmentTotals {
  const totals: AdjustmentTotals = { profit: 0, online: 0, paidByOwner: 0 };
  for (const adjustment of adjustments) {
    const effect = adjustmentEffect(adjustment);
    totals.profit += effect.profit;
    totals.online += effect.online;
    totals.paidByOwner += effect.paidByOwner;
  }
  return totals;
}
