import { createHash } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customerSpecialRates, customers, dealItems, deals, services, staff } from "@/db/schema";
import { offeredDeals, type CatalogDeal, type CatalogService, type StaffOption } from "@/lib/catalog";
import { pricingFingerprint, type CatalogCopy, type OfflineCatalog, type RateCustomer } from "@/lib/offline/catalog";
import { getOpenBusinessDay } from "./business-day";

export interface ActiveCatalog {
  services: CatalogService[];
  deals: CatalogDeal[];
  staff: StaffOption[];
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
    db.select().from(dealItems),
    db.select({ id: staff.id, name: staff.name }).from(staff).where(eq(staff.active, true)).orderBy(staff.name),
  ]);

  return {
    services: serviceRows.map(({ id, name, category, price, maxPrice, minutes }) => ({ id, name, category, price, maxPrice, minutes })),
    deals: offeredDeals(dealRows, dealItemRows, new Set(serviceRows.map((row) => row.id))),
    staff: staffRows,
  };
}

/**
 * The counter's offline copy (P2.2b): the active catalog, the customers who
 * have a special rate, and the open business date, stamped with a version of
 * its pricing. Served by `app/api/offline/catalog`.
 */
export async function getCatalogCopy(): Promise<CatalogCopy> {
  const [active, day, rateRows] = await Promise.all([
    getActiveCatalog(),
    getOpenBusinessDay(),
    db
      .select({
        customerId: customers.id,
        phone: customers.phone,
        name: customers.name,
        serviceId: customerSpecialRates.serviceId,
        price: customerSpecialRates.price,
      })
      .from(customerSpecialRates)
      .innerJoin(customers, eq(customerSpecialRates.customerId, customers.id))
      .orderBy(asc(customers.phone)),
  ]);

  const byCustomer = new Map<string, RateCustomer>();
  for (const row of rateRows) {
    const customer = byCustomer.get(row.customerId) ?? { id: row.customerId, phone: row.phone, name: row.name, specialRates: {} };
    customer.specialRates[row.serviceId] = row.price;
    byCustomer.set(row.customerId, customer);
  }

  const catalog: OfflineCatalog = {
    businessDate: day?.businessDate ?? null,
    ...active,
    customersWithRates: [...byCustomer.values()],
  };

  return {
    catalog,
    version: createHash("sha256").update(pricingFingerprint(catalog)).digest("hex"),
    servedAt: new Date().toISOString(),
  };
}
