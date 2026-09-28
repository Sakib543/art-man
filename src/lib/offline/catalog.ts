import type { Rupees } from "@/lib/accounting";
import type { Role } from "@/lib/auth/roles";
import type { CatalogDeal, CatalogService, StaffOption } from "@/lib/catalog";

/**
 * The counter's offline copy of the catalog (backlog P2.2b): everything needed
 * to price a bill with no server, kept in the browser's IndexedDB
 * (`./store.ts`) and refreshed by `components/catalog-sync.tsx`.
 *
 * Pure: the server builds it (`db/queries/catalog.ts`), the browser keeps it.
 */

/** Where the browser fetches it. A Route Handler — see its own comment for why. */
export const CATALOG_URL = "/api/offline/catalog";

/** How old a copy may get while online before it is fetched again. */
export const REFRESH_EVERY_MS = 15 * 60_000;

/**
 * A customer, so that a number typed at the counter with no internet still
 * brings up the name and any special rate.
 *
 * **Every** customer, since P2.2d — the client's choice (2026-09-29). P2.2b
 * kept only those with a special rate, so the full list of names and numbers
 * would not sit in the browser of whoever signs in; the client preferred that
 * offline billing know everyone. The copy is still cleared at sign-out and
 * never cached by the network (`no-store`).
 */
export interface OfflineCustomer {
  id: string;
  phone: string;
  name: string;
  /** Fixed prices by service id; empty for most customers. */
  specialRates: Record<string, Rupees>;
}

/** Plain JSON: it crosses the network and is stored as it arrives. */
export interface OfflineCatalog {
  /** The business day open when the copy was made, or null when none was. */
  businessDate: string | null;
  services: CatalogService[];
  deals: CatalogDeal[];
  staff: StaffOption[];
  customers: OfflineCustomer[];
}

/**
 * Who was signed in when the server made the copy (P2.2d). Offline, it is the
 * only word on who is at the counter: an offline bill is recorded as made by
 * them, and the offline screen says whose sign-in it is running on.
 */
export interface OfflineUser {
  id: string;
  name: string;
  username: string;
  role: Role;
}

export interface CatalogCopy {
  catalog: OfflineCatalog;
  /**
   * sha-256 of `pricingFingerprint(catalog)`. Two copies with the same
   * version price every bill the same way, so an offline bill can say which
   * prices it was made with (P2.2c).
   */
  version: string;
  /** The server's clock when the copy was made, ISO — "prices as of". */
  servedAt: string;
  user: OfflineUser;
}

const byId = <T extends { id: string }>(rows: readonly T[]) =>
  [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

/**
 * Everything in the catalog that decides what a bill charges or what its
 * lines are called — and nothing else — in a fixed order, as one string.
 *
 * Left out, because no bill changes with them: the staff list (who may do
 * the work, checked again on sync), customers' names and numbers, a service's
 * category and minutes, and the business date.
 *
 * A deal's `serviceIds` keep their order: it decides which service gets the
 * leftover rupee of the split. Every other list is sorted, so rows read in a
 * different order give the same fingerprint.
 */
export function pricingFingerprint(catalog: OfflineCatalog): string {
  const rates = catalog.customers
    .flatMap((customer) =>
      Object.entries(customer.specialRates).map(([serviceId, price]) => [customer.id, serviceId, price] as const),
    )
    .sort(([customerA, serviceA], [customerB, serviceB]) =>
      customerA !== customerB ? (customerA < customerB ? -1 : 1) : serviceA < serviceB ? -1 : serviceA > serviceB ? 1 : 0,
    );

  return JSON.stringify({
    services: byId(catalog.services).map((service) => [service.id, service.name, service.price, service.maxPrice]),
    deals: byId(catalog.deals).map((deal) => [deal.id, deal.name, deal.price, deal.serviceIds]),
    specialRates: rates,
  });
}

/**
 * A light check of what came back from the network or out of IndexedDB,
 * enough to refuse an HTML page or an old shape — not a full validation.
 */
export function isCatalogCopy(value: unknown): value is CatalogCopy {
  if (typeof value !== "object" || value === null) return false;
  const copy = value as Partial<CatalogCopy>;
  const { catalog, user } = copy;
  return (
    typeof copy.version === "string" &&
    typeof copy.servedAt === "string" &&
    typeof catalog === "object" &&
    catalog !== null &&
    (catalog.businessDate === null || typeof catalog.businessDate === "string") &&
    Array.isArray(catalog.services) &&
    Array.isArray(catalog.deals) &&
    Array.isArray(catalog.staff) &&
    Array.isArray(catalog.customers) &&
    typeof user === "object" &&
    user !== null &&
    typeof user.username === "string" &&
    typeof user.name === "string"
  );
}

/** A customer in the copy by the number typed at the counter, as the server looks one up: exactly. */
export function customerByPhone(catalog: OfflineCatalog, phone: string): OfflineCustomer | null {
  const wanted = phone.trim();
  return catalog.customers.find((customer) => customer.phone === wanted) ?? null;
}
