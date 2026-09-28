import type { Rupees } from "@/lib/accounting";

/**
 * The counter's outbox (backlog P2.2c): bills the server has not received
 * yet. They wait in the browser's IndexedDB (`./store.ts`) and are sent,
 * oldest first, by `components/outbox-sync.tsx` to `SYNC_URL`, which saves
 * each through the same `createBill` the billing screen uses.
 *
 * A machine never drops a bill. One leaves the outbox when the server says it
 * has it, or when a person removes it with a reason; a bill the server refuses
 * waits in "Needs attention" until someone does one or the other.
 *
 * Pure: shapes and decisions only — no React, no IndexedDB, no `fetch`.
 */

/** Where the sync sends a bill. A Route Handler, for the reason `CATALOG_URL` is one. */
export const SYNC_URL = "/api/offline/sync";

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

/** What the sync sends: the entry without what only this browser needs. */
export type SyncRequest = Pick<
  OutboxEntry,
  "v" | "clientId" | "businessDate" | "catalogVersion" | "madeAt" | "madeBy" | "bill"
>;

export function syncRequestOf(entry: OutboxEntry): SyncRequest {
  const { v, clientId, businessDate, catalogVersion, madeAt, madeBy, bill } = entry;
  return { v, clientId, businessDate, catalogVersion, madeAt, madeBy, bill };
}

/** The route's answer when it has the bill (200). */
export interface SyncSaved {
  billNo: number;
  /** True when the bill had arrived before — a send whose answer was lost. */
  alreadySaved: boolean;
}

/** The route's answer when it looked at the bill and said no (422). */
export interface SyncRefused {
  reason: string;
}

export type SyncOutcome =
  | ({ kind: "saved" } & SyncSaved)
  | ({ kind: "rejected" } & SyncRefused)
  | { kind: "signed-out" }
  | { kind: "later" };

function isSaved(body: unknown): body is SyncSaved {
  if (typeof body !== "object" || body === null) return false;
  const saved = body as Partial<SyncSaved>;
  return Number.isInteger(saved.billNo) && typeof saved.alreadySaved === "boolean";
}

function isRefused(body: unknown): body is SyncRefused {
  if (typeof body !== "object" || body === null) return false;
  const reason = (body as Partial<SyncRefused>).reason;
  return typeof reason === "string" && reason.length > 0;
}

/**
 * What an answer from `SYNC_URL` means for the bill that was sent.
 *
 * Only two answers are final: the server has the bill (200), or it looked at
 * it and said no (422, with the reason). Anything else — a network error, a
 * timeout, a 500, maintenance, a page that is not JSON — says nothing about
 * the bill, so it stays where it is and is sent again later; sending twice is
 * safe (P3.15). A 401, or the proxy's redirect to /login (which `redirect:
 * "manual"` turns into an `opaqueredirect`), means nobody is signed in: the
 * bill waits for the next sign-in.
 */
export function outcomeOf(response: { status: number; type?: string }, body: unknown): SyncOutcome {
  if (response.type === "opaqueredirect" || response.status === 401) return { kind: "signed-out" };
  if (response.status === 200 && isSaved(body)) {
    return { kind: "saved", billNo: body.billNo, alreadySaved: body.alreadySaved };
  }
  if (response.status === 422 && isRefused(body)) return { kind: "rejected", reason: body.reason };
  return { kind: "later" };
}

/**
 * The next bill to send: the oldest one not waiting for a person. `entries`
 * come in the order they were queued, which is the order they were made.
 * A refused bill does not hold up the ones behind it.
 */
export function nextToSend(entries: readonly OutboxEntry[]): OutboxEntry | null {
  return entries.find((entry) => entry.rejected === null) ?? null;
}

/** Waiting to be sent, and refused by the server. */
export function outboxCounts(entries: readonly OutboxEntry[]): { waiting: number; refused: number } {
  const refused = entries.filter((entry) => entry.rejected !== null).length;
  return { waiting: entries.length - refused, refused };
}

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
    (rejected === null ||
      (typeof rejected === "object" && typeof rejected?.reason === "string" && typeof rejected.at === "string"))
  );
}
