import type { DayBill } from "@/db/queries/day-bills";
import type { FolderKind, Rupees } from "@/lib/accounting";
import { rs } from "@/lib/format";

export type FeedTone = "good" | "bad" | "muted" | "brass";

export interface FeedItem {
  id: string;
  /** ISO time, for ordering and display. */
  at: string;
  text: string;
  sub: string;
  tone: FeedTone;
}

export interface FeedEntry {
  id: string;
  createdAt: string;
  kind: FolderKind;
  amount: Rupees;
  description: string | null;
  staffName: string | null;
  /** This row cancels an earlier entry. */
  isVoid: boolean;
}

function billItem(bill: DayBill): FeedItem {
  const at = bill.createdAt;
  if (bill.status === "cancelled") {
    return { id: bill.id, at, text: `Bill #${bill.billNo} cancelled`, sub: `Reason: ${bill.cancelReason ?? "none given"}`, tone: "bad" };
  }
  if (bill.status === "reversal") {
    return { id: bill.id, at, text: `Reversal for #${bill.reversesBillNo ?? "?"}`, sub: rs(bill.total), tone: "muted" };
  }
  return { id: bill.id, at, text: `Bill #${bill.billNo} for ${bill.customerName ?? "Walk-in"}`, sub: rs(bill.total), tone: "good" };
}

function entryItem(entry: FeedEntry): FeedItem {
  const base = { id: entry.id, at: entry.createdAt, sub: rs(entry.amount) };
  if (entry.isVoid) return { ...base, text: "Entry cancelled", tone: "muted" };

  switch (entry.kind) {
    case "expense":
      return { ...base, text: `Expense: ${entry.description ?? ""}`, tone: "brass" };
    case "staff_advance":
      return { ...base, text: `Advance to ${entry.staffName ?? "staff"}`, tone: "brass" };
    case "staff_payment":
      return { ...base, text: `Payment to ${entry.staffName ?? "staff"}`, tone: "brass" };
    case "owner_took":
      return { ...base, text: "Owner took cash", tone: "brass" };
    case "owner_added":
      return { ...base, text: "Owner added cash", tone: "brass" };
  }
}

/** Bills and folder entries of the day, newest first. */
export function buildFeed(bills: DayBill[], entries: FeedEntry[], limit = 12): FeedItem[] {
  return [...bills.map(billItem), ...entries.map(entryItem)].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
