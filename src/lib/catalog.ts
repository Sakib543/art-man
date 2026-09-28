import type { Rupees } from "@/lib/accounting";

/**
 * What the counter can sell, as plain data (safe to serialise).
 *
 * These lived in `features/billing/types.ts` until P2.2b. They moved up so the
 * browser's offline copy of the catalog (`lib/offline/catalog.ts`) is built
 * from the very same shapes the billing screen renders: if one changes, the
 * other cannot quietly keep the old form.
 */

export interface CatalogService {
  id: string;
  name: string;
  category: string;
  /** The price, or the bottom of the range when `maxPrice` is set (P3.11). */
  price: Rupees;
  /** The top of the range, or null for one fixed price. */
  maxPrice: Rupees | null;
  minutes: number | null;
}

export interface CatalogDeal {
  id: string;
  name: string;
  price: Rupees;
  /**
   * In the order the database returned them. The order is part of the price:
   * `allocate` breaks a tie for the leftover rupee by position.
   */
  serviceIds: string[];
}

export interface StaffOption {
  id: string;
  name: string;
}

/**
 * The deals the counter may sell: each with its services attached, and only
 * while every one of those services is active. Switching a service off takes
 * every deal that contains it off the screen with it.
 */
export function offeredDeals(
  deals: readonly { id: string; name: string; price: Rupees }[],
  items: readonly { dealId: string; serviceId: string }[],
  activeServiceIds: ReadonlySet<string>,
): CatalogDeal[] {
  return deals
    .map(({ id, name, price }) => ({
      id,
      name,
      price,
      serviceIds: items.filter((item) => item.dealId === id).map((item) => item.serviceId),
    }))
    .filter((deal) => deal.serviceIds.every((serviceId) => activeServiceIds.has(serviceId)));
}
