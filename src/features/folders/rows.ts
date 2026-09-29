import type { DayBill } from "@/db/queries/day-bills";
import {
  ENTRY_VERSION,
  waitingBills,
  waitingFolderEntries,
  type OutboxFolder,
  type OutboxFolderEntry,
  type OutboxItem,
} from "@/lib/offline/outbox";
import type { EntryRow, OnlineRow } from "./types";

/**
 * The Daily folders screen's rows when some of the day is still on this
 * computer (backlog P2.2e): entries and bills made offline, shown beside what
 * the server has so the counter sees the whole day. Pure — the screen reads
 * the outbox, this only turns it into rows.
 */

/** What an entry is called in the list: the server's own wording (`addEntry`), so a pending row reads like the saved one. */
export function folderEntryText(item: OutboxFolderEntry): string {
  return item.entry.kind === "staff_advance"
    ? `Advance to ${item.preview.staffName || "a staff member"}`
    : item.entry.description;
}

/** Entries of `businessDate` still waiting to be sent, as rows. `known`: the ids the server already listed. */
export function pendingEntryRows(items: readonly OutboxItem[], businessDate: string, known: ReadonlySet<string>): EntryRow[] {
  return waitingFolderEntries(items, businessDate, known)
    .map<EntryRow>((item) => ({
      id: item.clientId,
      clientId: item.clientId,
      createdAt: item.madeAt,
      kind: item.entry.kind,
      amount: item.entry.amount,
      description: folderEntryText(item),
      paidFrom: item.entry.kind === "expense" ? item.entry.paidFrom : null,
      staffName: item.preview.staffName,
      pinConfirmed: false,
      isVoid: false,
      voided: false,
      pending: true,
    }))
    .reverse(); // Newest first, as the server lists them.
}

/** Bills of `businessDate` still waiting to be sent that were paid online, as rows of the Online folder. */
export function pendingOnlineRows(items: readonly OutboxItem[], businessDate: string, known: ReadonlySet<string>): OnlineRow[] {
  return waitingBills(items, businessDate, known)
    .filter((entry) => entry.bill.online !== 0)
    .map<OnlineRow>((entry) => ({
      key: entry.clientId,
      // A bill made offline has a `T-` number on its slip — or the paper book's, if written there first.
      ref: entry.bill.bookNo ?? "offline",
      clientId: entry.clientId,
      createdAt: entry.madeAt,
      customerName: entry.preview.customerName,
      amount: entry.bill.online,
      pending: true,
    }))
    .reverse();
}

/** The Online folder of a day's bills, from the offline copy of the day — as `getFoldersData` reads it from the database. */
export function onlineRowsOf(bills: readonly DayBill[]): OnlineRow[] {
  return bills
    .filter((bill) => bill.online !== 0)
    .map<OnlineRow>((bill) => ({
      key: bill.id,
      ref: `#${bill.billNo}`,
      clientId: bill.clientId,
      createdAt: bill.createdAt,
      customerName: bill.customerName,
      amount: bill.online,
      pending: false,
    }));
}

/** The most `entrySchema` accepts for one entry. */
export const MAX_ENTRY_AMOUNT = 10_000_000;

/**
 * What the server's `entrySchema` would refuse in an entry the outbox may
 * keep — in words the counter can act on — or null when nothing (P2.2e). The
 * screen checks before keeping one: an entry the server would refuse is
 * better stopped at the counter than found in "Needs attention" hours later.
 */
export function offlineEntryProblem(entry: OutboxFolder): string | null {
  if (!Number.isInteger(entry.amount) || entry.amount < 1) return "Enter an amount in whole rupees";
  if (entry.amount > MAX_ENTRY_AMOUNT) return `An entry can be at most Rs ${MAX_ENTRY_AMOUNT.toLocaleString("en-US")}`;
  if (entry.kind === "expense" && !entry.description.trim()) return "Say what the expense was for";
  if (entry.kind === "expense" && entry.description.trim().length > 120) return "Keep the description to 120 characters";
  if (entry.kind === "staff_advance" && !entry.staffId) return "Choose a staff member";
  return null;
}

export interface OfflineEntryParts {
  clientId: string;
  /** The day it is made on, and so the only day the server will take it into. */
  businessDate: string;
  madeBy: string;
  /** Now, as an ISO string. */
  madeAt: string;
  entry: OutboxFolder;
  staffNames: Record<string, string>;
}

/** An entry made with no internet, as the outbox keeps it (P2.2e). */
export function offlineEntryOf(parts: OfflineEntryParts): OutboxFolderEntry {
  const { entry } = parts;
  return {
    v: ENTRY_VERSION,
    type: "folder",
    clientId: parts.clientId,
    businessDate: parts.businessDate,
    madeAt: parts.madeAt,
    madeBy: parts.madeBy,
    // Trimmed as the server will trim it, so the pending row and the saved one read alike.
    entry: entry.kind === "expense" ? { ...entry, description: entry.description.trim() } : entry,
    preview: { staffName: entry.kind === "staff_advance" ? (parts.staffNames[entry.staffId] ?? null) : null },
    rejected: null,
  };
}
