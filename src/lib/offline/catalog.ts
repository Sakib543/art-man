import type { Rupees } from "@/lib/accounting";
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
 * A customer who has a special rate (P3.2) — and **only** those.
 *
 * The rates are what change a price, so offline billing cannot do without
 * them. Every other customer is left out on purpose: the full list with phone
 * numbers would sit in the browser of whoever signed in, where anyone with
 * the developer tools could copy it, and the Customers screen is kept from the
 * Manager for much the same reason (HANDOFF 9, question 1). Offline, any other
 * number is treated as new; the name typed for it is dropped on sync, because
 * `createBill` keeps an existing customer's own record.
 */
export interface RateCustomer {
  id: string;
  phone: string;
  name: string;
  /** Fixed prices by service id. */
  specialRates: Record<string, Rupees>;
}

/** Plain JSON: it crosses the network and is stored as it arrives. */
export interface OfflineCatalog {
  /** The business day open when the copy was made, or null when none was. */
  businessDate: string | null;
  services: CatalogService[];
  deals: CatalogDeal[];
  staff: StaffOption[];
  customersWithRates: RateCustomer[];
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
  const rates = catalog.customersWithRates
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
  const catalog = copy.catalog;
  return (
    typeof copy.version === "string" &&
    typeof copy.servedAt === "string" &&
    typeof catalog === "object" &&
    catalog !== null &&
    (catalog.businessDate === null || typeof catalog.businessDate === "string") &&
    Array.isArray(catalog.services) &&
    Array.isArray(catalog.deals) &&
    Array.isArray(catalog.staff) &&
    Array.isArray(catalog.customersWithRates)
  );
}
