import type { DayBill } from "@/db/queries/day-bills";
import type { DayEntry } from "@/db/queries/day-entries";
import { isPayType, type DayPay, type Rupees } from "@/lib/accounting";

/**
 * The counter's copy of the open business day (backlog P2.2e): its bills and
 * folder entries as the server had them, and every staff member for the
 * register's columns. Kept in IndexedDB beside the catalog copy (P2.2b) and
 * refreshed by `components/day-sync.tsx` — far more often than the catalog,
 * after every save — so that with no internet the counter still sees the
 * whole day, not only what was made offline. Day Close offline (P2.2f) is
 * worked out from it, with what `close` adds: the opening cash, and the pay
 * and khata balance of each staff member the close lists.
 *
 * Only what a close needs (P7.13, QA-08): the copy reaches every role that
 * signs in on the counter, so it carries no more than the online Day close
 * gives the same person — no salary, and nobody the close would not list.
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

/**
 * What closing the day needs besides its bills and entries (P2.2f): what
 * Day Close reads from the server before the count.
 *
 * The opening cash stays in it (P7.13): no expected cash can be worked out
 * here without it. It is the last day's count, which the Daily report shows
 * the same people as "Counted"; the honest count (spec §5.4(4)) is kept on the
 * screen, which shows expected cash only after the count, offline as online.
 */
export interface DayCloseCopy {
  /** The day's opening cash: the last day's count, carried over. */
  openingCash: Rupees;
  /**
   * The pay of each staff member the close lists, by id — the active ones, and
   * anyone switched off with work on the day (`loadDay`'s rule). The day's
   * part of it only (`dayPayOf`): no salary, which no day earns.
   */
  pay: Record<string, DayPay>;
  /** The khata balance of the same staff, by id, as the server had it: the day's advances included. */
  khata: Record<string, Rupees>;
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
  /**
   * For closing the day offline (P2.2f); null when no day was open. A copy
   * kept before P2.2f has none, and then the day cannot be closed offline
   * until the next fresh copy — `closeCopyOf` says which.
   */
  close?: DayCloseCopy | null;
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

const isRecordOf = (value: unknown, check: (item: unknown) => boolean) =>
  typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every(check);

/** A copy made before P7.13 also has a salary; nothing reads it. */
const isPay = (value: unknown) => {
  if (typeof value !== "object" || value === null) return false;
  const pay = value as Partial<DayPay>;
  return (
    isPayType(pay.payType) &&
    typeof pay.dailyWage === "number" &&
    typeof pay.commissionRate === "number"
  );
};

/**
 * What a copy holds for closing the day offline (P2.2f), or null when it
 * holds nothing usable — a copy kept before P2.2f, or one read when no day
 * was open.
 */
export function closeCopyOf(copy: DayCopy): DayCloseCopy | null {
  const close = copy.close;
  if (typeof close !== "object" || close === null) return null;
  return typeof close.openingCash === "number" &&
    isRecordOf(close.pay, isPay) &&
    isRecordOf(close.khata, (balance) => typeof balance === "number")
    ? close
    : null;
}

/** The ids of what the server already has, to tell it from what is still in the outbox. */
export function knownIds(rows: readonly { clientId: string | null }[]): Set<string> {
  return new Set(rows.flatMap((row) => (row.clientId ? [row.clientId] : [])));
}
