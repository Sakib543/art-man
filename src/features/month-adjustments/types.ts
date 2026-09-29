import type { AdjustmentKind, PaidFrom, Rupees } from "@/lib/accounting";

/** One adjustment for a closed month, as the Monthly report lists it (backlog P3.4). */
export interface AdjustmentRow {
  id: string;
  createdAt: string;
  /** Who recorded it; "System" for a developer account (`recordedBy`). */
  createdBy: string;
  /** The month it counts in, "2026-10". */
  countsIn: string;
  /** The closed month it corrects, "2026-09". */
  corrects: string;
  kind: AdjustmentKind;
  /** Signed: how the closed month's figure should have read. A cancellation carries the opposite sign. */
  amount: Rupees;
  online: boolean | null;
  paidFrom: PaidFrom | null;
  staffName: string | null;
  reason: string;
  /** What it does to the profit of the month it counts in. */
  profit: Rupees;
  /** What it does to the staff member's khata. */
  khata: Rupees;
  /** A later row has cancelled it. */
  cancelled: boolean;
  /** This row cancels an earlier one. */
  isCancellation: boolean;
  /** Can the Owner still cancel it: neither of the above, and the month it counts in is open. */
  canCancel: boolean;
}

export interface StaffChoice {
  id: string;
  name: string;
  active: boolean;
}

/**
 * What the Monthly report of one month needs about adjustments: the ones that
 * count in it, the ones recorded later that correct it, and whether a new one
 * for it can be recorded now — with where it would count, or why not.
 */
export interface AdjustmentsData {
  countedHere: AdjustmentRow[];
  forThisMonth: AdjustmentRow[];
  record: { countsIn: string; staff: StaffChoice[] } | { blocked: string };
}
