import type { DayEntry } from "@/db/queries/day-entries";
import type { Rupees } from "@/lib/accounting";

/**
 * One row of the folders list: an entry the server has, or — `pending` — one
 * made offline that is still on this computer (P2.2e). A pending row's `id`
 * is its client id: it has no server id yet.
 */
export type EntryRow = DayEntry & { pending?: boolean };

/** A bill's online money, which goes to the Owner's bank and never enters the drawer. */
export interface OnlineRow {
  /** The bill's id — or, for one still on this computer, its client id. */
  key: string;
  /** "#41", or the number on its slip (`T-3`) while it is still on this computer. */
  ref: string;
  /** The id the billing screen gave it, to tell a bill the server has from one still waiting. */
  clientId: string | null;
  createdAt: string;
  customerName: string | null;
  amount: Rupees;
  /** Made offline and not on the server yet (P2.2e). */
  pending: boolean;
}

export interface StaffOption {
  id: string;
  name: string;
}

/**
 * What the Daily folders screen is drawn from: the server's rows, or the
 * offline copy of the day's (P2.2e). The screen adds what is still in the
 * outbox and works the totals out itself, with the same `folderTotals`.
 */
export interface FoldersData {
  businessDate: string;
  entries: EntryRow[];
  online: OnlineRow[];
  staff: StaffOption[];
}
