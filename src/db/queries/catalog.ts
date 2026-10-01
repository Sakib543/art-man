import { createHash } from "node:crypto";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { customerSpecialRates, customers, dealItems, deals, services, staff } from "@/db/schema";
import { offeredDeals, type CatalogDeal, type CatalogService, type StaffOption } from "@/lib/catalog";
import {
  pricingFingerprint,
  type CatalogCopy,
  type OfflineCatalog,
  type OfflineCustomer,
  type OfflineUser,
} from "@/lib/offline/catalog";
import { getOpenBusinessDay } from "./business-day";

export interface ActiveCatalog {
  services: CatalogService[];
  deals: CatalogDeal[];
  staff: StaffOption[];
}

/**
 * The services of deals, in one fixed order: as the menu lists the services
 * (when they were added, then name), then id (P7.18, QA-18). A deal's price is
 * split by list price, and a tie's spare rupee goes to the first of them —
 * read with no order, "first" was whatever Postgres returned, which an edit of
 * the deal, a VACUUM or a restore could change, and the commission with it.
 * It also keeps the offline copy's version (`versionOf`) from moving on its own.
 */
export function dealItemsInOrder(dealIds?: readonly string[]) {
  const query = db
    .select({ dealId: dealItems.dealId, serviceId: dealItems.serviceId })
    .from(dealItems)
    .innerJoin(services, eq(services.id, dealItems.serviceId));
  return (dealIds ? query.where(inArray(dealItems.dealId, [...dealIds])) : query).orderBy(
    asc(services.createdAt),
    asc(services.name),
    asc(services.id),
  );
}

/**
 * What the counter can sell right now. The billing screen and the browser's
 * offline copy (P2.2b) both read it from here, so the two cannot disagree
 * about what is on offer.
 */
export async function getActiveCatalog(): Promise<ActiveCatalog> {
  const [serviceRows, dealRows, dealItemRows, staffRows] = await Promise.all([
    db.select().from(services).where(eq(services.active, true)).orderBy(services.createdAt, services.name),
    db.select().from(deals).where(eq(deals.active, true)).orderBy(deals.name),
    dealItemsInOrder(),
    db.select({ id: staff.id, name: staff.name }).from(staff).where(eq(staff.active, true)).orderBy(staff.name),
  ]);

  return {
    services: serviceRows.map(({ id, name, category, price, maxPrice, minutes }) => ({ id, name, category, price, maxPrice, minutes })),
    deals: offeredDeals(dealRows, dealItemRows, new Set(serviceRows.map((row) => row.id))),
    staff: staffRows,
  };
}

/**
 * The counter's offline copy (P2.2b): the active catalog, every customer with
 * any special rates (all of them since P2.2d, the client's choice), the open
 * business date and who it was made for, stamped with a version of its
 * pricing. Served by `app/api/offline/catalog`.
 */
export async function getCatalogCopy(user: OfflineUser): Promise<CatalogCopy> {
  const catalog = await offlineCatalog();
  return {
    catalog,
    version: versionOf(catalog),
    servedAt: new Date().toISOString(),
    user: { id: user.id, name: user.name, username: user.username, role: user.role },
  };
}

/**
 * The version a copy made now would carry — what an offline bill's
 * `catalogVersion` is compared with, to tell "the prices moved" from any
 * other refusal (P2.2c).
 */
export async function getCatalogVersion(): Promise<string> {
  return versionOf(await offlineCatalog());
}

const versionOf = (catalog: OfflineCatalog) => createHash("sha256").update(pricingFingerprint(catalog)).digest("hex");

async function offlineCatalog(): Promise<OfflineCatalog> {
  const [active, day, customerRows, rateRows] = await Promise.all([
    getActiveCatalog(),
    getOpenBusinessDay(),
    db
      .select({ id: customers.id, phone: customers.phone, name: customers.name })
      .from(customers)
      .orderBy(asc(customers.phone)),
    db
      .select({
        customerId: customerSpecialRates.customerId,
        serviceId: customerSpecialRates.serviceId,
        price: customerSpecialRates.price,
      })
      .from(customerSpecialRates),
  ]);

  const byId = new Map<string, OfflineCustomer>(
    customerRows.map((row) => [row.id, { id: row.id, phone: row.phone, name: row.name, specialRates: {} }]),
  );
  for (const rate of rateRows) {
    const customer = byId.get(rate.customerId);
    if (customer) customer.specialRates[rate.serviceId] = rate.price;
  }

  return {
    businessDate: day?.businessDate ?? null,
    ...active,
    customers: [...byId.values()],
  };
}
