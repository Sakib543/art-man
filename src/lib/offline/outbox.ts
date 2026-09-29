import type { PaidFrom, Rupees } from "@/lib/accounting";

/**
 * The counter's outbox (backlog P2.2c): what the server has not received
 * yet. It waits in the browser's IndexedDB (`./store.ts`) and is sent, oldest
 * first, by `components/outbox-sync.tsx`, which saves each through the same
 * service the screen itself uses.
 *
 * Two kinds of thing wait in it, in the order they were made:
 *
 * - a bill (`OutboxEntry`, P2.2c), sent to `SYNC_URL` and saved by
 *   `createBill`. It carries no `type`: until P2.2e it was the only kind;
 * - a folder entry (`OutboxFolderEntry`, P2.2e) — an expense or a staff
 *   advance — sent to `FOLDER_SYNC_URL` and saved by `addEntry`.
 *
 * A machine never drops either. One leaves the outbox when the server says it
 * has it, or when a person removes it with a reason; one the server refuses
 * waits in "Needs attention" until someone does one or the other.
 *
 * Pure: shapes and decisions only — no React, no IndexedDB, no `fetch`.
 */

/** Where the sync sends a bill. A Route Handler, for the reason `CATALOG_URL` is one. */
export const SYNC_URL = "/api/offline/sync";

/** Where the sync sends a folder entry (P2.2e). */
export const FOLDER_SYNC_URL = "/api/offline/folders";

/** The shape entries are written in. A change old entries cannot be read in needs a new number. */
export const ENTRY_VERSION = 1;

/** A line as the billing screen sends it (`createBillSchema`). */
export interface OutboxLine {
  serviceId: string | null;
  staffId: string;
  dealId: string | null;
  dealInstanceId: string | null;
  amount: Rupees | null;
  description: string | null;
}

/** The bill itself: what `createBillAction` would have been sent, without its id. */
export interface OutboxBill {
  lines: OutboxLine[];
  customer: { phone: string; name?: string } | null;
  cash: Rupees;
  online: Rupees;
  bookNo: string | null;
  discount: Rupees;
  discountReason: string | null;
}

/**
 * What the counter saw when it made the bill — names, not ids — so it can be
 * shown without a catalog: in "Needs attention", and on the receipt printed
 * offline (P2.2d).
 */
export interface OutboxPreview {
  customerName: string | null;
  lines: { name: string; staffName: string; amount: Rupees }[];
  total: Rupees;
}

/**
 * A bill the server has not received yet (P2.2c). The name is from when the
 * outbox held nothing else; a folder entry is `OutboxFolderEntry`.
 */
export interface OutboxEntry {
  v: typeof ENTRY_VERSION;
  /** The bill's id, which becomes `bills.client_id`. The server saves one id once (P3.15). */
  clientId: string;
  /** The business day it was made on — the only day the server will put it in. */
  businessDate: string;
  /** The offline copy's version it was priced with (P2.2b), or null if there was none. */
  catalogVersion: string | null;
  /** When it was made, by this device's clock, ISO. */
  madeAt: string;
  /** Who was signed in. It goes to the audit log; whoever is signed in at sync time saves it. */
  madeBy: string;
  bill: OutboxBill;
  preview: OutboxPreview;
  /** Why the server refused it, once it has. Null while it waits to be sent. */
  rejected: { reason: string; at: string } | null;
}

/**
 * A folder entry as the server's `addEntry` takes it (P2.2e) — only the two
 * the counter may make with no internet. The Owner's own cash needs the
 * Owner's PIN, which the server checks and the device never keeps (the
 * client's answer, 2026-09-26), so it waits for the internet.
 */
export type OutboxFolder =
  | { kind: "expense"; amount: Rupees; description: string; paidFrom: PaidFrom }
  | { kind: "staff_advance"; amount: Rupees; staffId: string };

/** A folder entry the server has not received yet (P2.2e). */
export interface OutboxFolderEntry {
  v: typeof ENTRY_VERSION;
  /** What tells it from a bill, which has no `type`. */
  type: "folder";
  /** The entry's id, which becomes `cash_entries.client_id`: the server saves one id once. */
  clientId: string;
  /** The business day it was made on — the only day the server will put it in. */
  businessDate: string;
  /** When it was made, by this device's clock, ISO. */
  madeAt: string;
  /** Who was signed in. It goes to the audit log; whoever is signed in at sync time saves it. */
  madeBy: string;
  entry: OutboxFolder;
  /** What the counter saw, so it can be listed without the catalog: an advance's staff member. */
  preview: { staffName: string | null };
  /** Why the server refused it, once it has. Null while it waits to be sent. */
  rejected: { reason: string; at: string } | null;
}

/** Anything in the outbox. */
export type OutboxItem = OutboxEntry | OutboxFolderEntry;

export const isFolderItem = (item: OutboxItem): item is OutboxFolderEntry =>
  (item as Partial<OutboxFolderEntry>).type === "folder";

export const isBillItem = (item: OutboxItem): item is OutboxEntry => !isFolderItem(item);

/** What the sync sends: the entry without what only this browser needs. */
export type SyncRequest = Pick<
  OutboxEntry,
  "v" | "clientId" | "businessDate" | "catalogVersion" | "madeAt" | "madeBy" | "bill"
>;

export function syncRequestOf(entry: OutboxEntry): SyncRequest {
  const { v, clientId, businessDate, catalogVersion, madeAt, madeBy, bill } = entry;
  return { v, clientId, businessDate, catalogVersion, madeAt, madeBy, bill };
}

/** What the sync sends for a folder entry (P2.2e), likewise. */
export type FolderSyncRequest = Pick<
  OutboxFolderEntry,
  "v" | "type" | "clientId" | "businessDate" | "madeAt" | "madeBy" | "entry"
>;

export function folderSyncRequestOf(item: OutboxFolderEntry): FolderSyncRequest {
  const { v, type, clientId, businessDate, madeAt, madeBy, entry } = item;
  return { v, type, clientId, businessDate, madeAt, madeBy, entry };
}

/** Where an item is sent, what is sent, and how the answer is read (`outcomeOf`). */
export function syncOf(item: OutboxItem): { url: string; body: SyncRequest | FolderSyncRequest; kind: SyncKind } {
  return isFolderItem(item)
    ? { url: FOLDER_SYNC_URL, body: folderSyncRequestOf(item), kind: "folder" }
    : { url: SYNC_URL, body: syncRequestOf(item), kind: "bill" };
}

export type SyncKind = "bill" | "folder";

/** The bill route's answer when it has the bill (200). */
export interface SyncSaved {
  billNo: number;
  /** True when the bill had arrived before — a send whose answer was lost. */
  alreadySaved: boolean;
}

/** The folder route's answer when it has the entry (200). An entry has no number to give back. */
export interface FolderSyncSaved {
  alreadySaved: boolean;
}

/** Either route's answer when it looked at what was sent and said no (422). */
export interface SyncRefused {
  reason: string;
}

export type SyncOutcome =
  | { kind: "saved"; alreadySaved: boolean; billNo?: number }
  | ({ kind: "rejected" } & SyncRefused)
  | { kind: "signed-out" }
  | { kind: "later" };

function isSaved(body: unknown): body is SyncSaved {
  if (typeof body !== "object" || body === null) return false;
  const saved = body as Partial<SyncSaved>;
  return Number.isInteger(saved.billNo) && typeof saved.alreadySaved === "boolean";
}

function isFolderSaved(body: unknown): body is FolderSyncSaved {
  return typeof body === "object" && body !== null && typeof (body as Partial<FolderSyncSaved>).alreadySaved === "boolean";
}

function isRefused(body: unknown): body is SyncRefused {
  if (typeof body !== "object" || body === null) return false;
  const reason = (body as Partial<SyncRefused>).reason;
  return typeof reason === "string" && reason.length > 0;
}

/**
 * What an answer from `SYNC_URL` — or, for a folder entry, `FOLDER_SYNC_URL`
 * — means for what was sent.
 *
 * Only two answers are final: the server has it (200), or it looked at it and
 * said no (422, with the reason). Anything else — a network error, a timeout,
 * a 500, maintenance, a page that is not JSON — says nothing about it, so it
 * stays where it is and is sent again later; sending twice is safe, because
 * the server saves one id once (P3.15, P2.2e). A 401, or the proxy's redirect
 * to /login (which `redirect: "manual"` turns into an `opaqueredirect`), means
 * nobody is signed in: it waits for the next sign-in.
 */
export function outcomeOf(
  response: { status: number; type?: string },
  body: unknown,
  kind: SyncKind = "bill",
): SyncOutcome {
  if (response.type === "opaqueredirect" || response.status === 401) return { kind: "signed-out" };
  if (response.status === 200) {
    if (kind === "bill" && isSaved(body)) return { kind: "saved", billNo: body.billNo, alreadySaved: body.alreadySaved };
    if (kind === "folder" && isFolderSaved(body)) return { kind: "saved", alreadySaved: body.alreadySaved };
  }
  if (response.status === 422 && isRefused(body)) return { kind: "rejected", reason: body.reason };
  return { kind: "later" };
}

/**
 * The next thing to send: the oldest one not waiting for a person. `entries`
 * come in the order they were queued, which is the order they were made.
 * A refused one does not hold up the ones behind it.
 */
export function nextToSend<T extends { rejected: unknown }>(entries: readonly T[]): T | null {
  return entries.find((entry) => entry.rejected === null) ?? null;
}

/** Waiting to be sent, and refused by the server. */
export function outboxCounts(entries: readonly { rejected: unknown }[]): { waiting: number; refused: number } {
  const refused = entries.filter((entry) => entry.rejected !== null).length;
  return { waiting: entries.length - refused, refused };
}

/** How many bills and how many folder entries. */
export interface KindCounts {
  bills: number;
  entries: number;
}

/** The outbox counted both ways: waiting or refused, bill or folder entry (P2.2e). */
export function outboxTally(items: readonly OutboxItem[]): { waiting: KindCounts; refused: KindCounts } {
  const tally = { waiting: { bills: 0, entries: 0 }, refused: { bills: 0, entries: 0 } };
  for (const item of items) {
    const side = item.rejected === null ? tally.waiting : tally.refused;
    if (isFolderItem(item)) side.entries += 1;
    else side.bills += 1;
  }
  return tally;
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** "1 bill", "2 folder entries", "2 bills and 1 folder entry" — nothing when both are 0. */
export function describeCounts({ bills, entries }: KindCounts): string {
  const parts = [
    bills > 0 ? plural(bills, "bill", "bills") : null,
    entries > 0 ? plural(entries, "folder entry", "folder entries") : null,
  ].filter(Boolean);
  return parts.join(" and ");
}

/**
 * The bills of one business day still waiting to be sent: not refused, and
 * not among `known` — the ids of the bills the server has already listed. A
 * bill whose send arrived but whose answer was lost is in both places for a
 * moment; `known` is what keeps a screen from counting it twice (P2.2e).
 */
export function waitingBills(items: readonly OutboxItem[], businessDate: string, known: ReadonlySet<string>): OutboxEntry[] {
  return items.filter(
    (item): item is OutboxEntry =>
      isBillItem(item) && item.rejected === null && item.businessDate === businessDate && !known.has(item.clientId),
  );
}

/** The same for folder entries (P2.2e). */
export function waitingFolderEntries(
  items: readonly OutboxItem[],
  businessDate: string,
  known: ReadonlySet<string>,
): OutboxFolderEntry[] {
  return items.filter(
    (item): item is OutboxFolderEntry =>
      isFolderItem(item) && item.rejected === null && item.businessDate === businessDate && !known.has(item.clientId),
  );
}

const isRejection = (rejected: unknown) =>
  rejected === null ||
  (typeof rejected === "object" &&
    typeof (rejected as { reason?: unknown }).reason === "string" &&
    typeof (rejected as { at?: unknown }).at === "string");

/**
 * A light check of what comes out of IndexedDB — enough to refuse an old or
 * broken shape, not a full validation. The server validates what it saves.
 */
export function isOutboxEntry(value: unknown): value is OutboxEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<OutboxEntry>;
  const { bill, preview, rejected } = entry;
  return (
    entry.v === ENTRY_VERSION &&
    typeof entry.clientId === "string" &&
    typeof entry.businessDate === "string" &&
    (entry.catalogVersion === null || typeof entry.catalogVersion === "string") &&
    typeof entry.madeAt === "string" &&
    typeof entry.madeBy === "string" &&
    typeof bill === "object" &&
    bill !== null &&
    Array.isArray(bill.lines) &&
    typeof bill.cash === "number" &&
    typeof bill.online === "number" &&
    typeof preview === "object" &&
    preview !== null &&
    Array.isArray(preview.lines) &&
    typeof preview.total === "number" &&
    isRejection(rejected)
  );
}

/** The same light check for a folder entry (P2.2e). */
export function isOutboxFolderEntry(value: unknown): value is OutboxFolderEntry {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<OutboxFolderEntry>;
  const { entry, preview } = item;
  const kindOk =
    typeof entry === "object" &&
    entry !== null &&
    typeof entry.amount === "number" &&
    (entry.kind === "expense"
      ? typeof entry.description === "string" && (entry.paidFrom === "drawer" || entry.paidFrom === "owner")
      : entry.kind === "staff_advance" && typeof entry.staffId === "string");
  return (
    item.v === ENTRY_VERSION &&
    item.type === "folder" &&
    typeof item.clientId === "string" &&
    typeof item.businessDate === "string" &&
    typeof item.madeAt === "string" &&
    typeof item.madeBy === "string" &&
    kindOk &&
    typeof preview === "object" &&
    preview !== null &&
    (preview.staffName === null || typeof preview.staffName === "string") &&
    isRejection(item.rejected)
  );
}

/**
 * Anything this build can read. A row it cannot — one a newer build wrote —
 * is left in the store untouched, for the build that can.
 */
export const isOutboxItem = (value: unknown): value is OutboxItem => isOutboxEntry(value) || isOutboxFolderEntry(value);
