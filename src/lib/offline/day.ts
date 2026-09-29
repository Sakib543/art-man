import type { DayBill } from "@/db/queries/day-bills";
import type { DayEntry } from "@/db/queries/day-entries";

/**
 * The counter's copy of the open business day (backlog P2.2e): its bills and
 * folder entries as the server had them, and every staff member for the
 * register's columns. Kept in IndexedDB beside the catalog copy (P2.2b) and
 * refreshed by `components/day-sync.tsx` — far more often than the catalog,
 * after every save — so that with no internet the counter still sees the
 * whole day, not only what was made offline. Day Close offline (P2.2f) is
 * meant to build on it.
 *
 * Pure: the server builds it (`db/queries/day-copy.ts`), the browser keeps it.
 */

/** Where the browser fetches it. A Route Handler, for the reason `CATALOG_URL` is one. */
export const DAY_URL = "/api/offline/day";

/**
 * How old the copy may get while online before it is fetched again. Every
 * save asks for a fresh one anyway; this catches what another device did.
 */
export const DAY_REFRESH_EVERY_MS = 5 * 60_000;

/** A staff member as the register draws a column: active, or not but with work on the day. */
export interface DayStaff {
  id: string;
  name: string;
  active: boolean;
}

/** Plain JSON: it crosses the network and is stored as it arrives. */
export interface DayCopy {
  /** The open day, or null when none was open. */
  businessDate: string | null;
  /** Newest first, as every day list reads them. */
  bills: DayBill[];
  /** Newest first. */
  entries: DayEntry[];
  /** Every staff member, active or not, in the order they joined. */
  staff: DayStaff[];
  /** The server's clock when it read the day, ISO: "as of". */
  servedAt: string;
}

/**
 * A light check of what came back from the network or out of IndexedDB,
 * enough to refuse an HTML page or an error body — not a full validation.
 */
export function isDayCopy(value: unknown): value is DayCopy {
  if (typeof value !== "object" || value === null) return false;
  const copy = value as Partial<DayCopy>;
  return (
    (copy.businessDate === null || typeof copy.businessDate === "string") &&
    Array.isArray(copy.bills) &&
    Array.isArray(copy.entries) &&
    Array.isArray(copy.staff) &&
    typeof copy.servedAt === "string"
  );
}

/**
 * The copy, when it is of `businessDate` — the day the counter is working
 * in. A copy of another day (read before a close, say) says nothing about this
 * one, and showing its bills as today's would be wrong.
 */
export function dayFor<T extends DayCopy>(copy: T | null, businessDate: string): T | null {
  return copy && copy.businessDate === businessDate ? copy : null;
}

/** The ids of what the server already has, to tell it from what is still in the outbox. */
export function knownIds(rows: readonly { clientId: string | null }[]): Set<string> {
  return new Set(rows.flatMap((row) => (row.clientId ? [row.clientId] : [])));
}
