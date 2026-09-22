import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { customerSpecialRates, customers, services } from "@/db/schema";
import type { CustomerDetail, CustomerRow, CustomersData } from "./types";

/** The counter should not scroll through a thousand names to find one. */
const PAGE = 50;

/** Everything one service could be priced at for this customer. */
async function detailOf(customerId: string): Promise<CustomerDetail | null> {
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!customer) return null;

  // Every active service, with this customer's price beside it when there is
  // one. A left join rather than two lists, so the screen shows one table and
  // the "no special rate" case needs no matching up in JavaScript.
  const rows = await db
    .select({
      serviceId: services.id,
      serviceName: services.name,
      listPrice: services.price,
      price: customerSpecialRates.price,
    })
    .from(services)
    .leftJoin(
      customerSpecialRates,
      and(eq(customerSpecialRates.serviceId, services.id), eq(customerSpecialRates.customerId, customerId)),
    )
    .where(eq(services.active, true))
    .orderBy(asc(services.name));

  return { id: customer.id, name: customer.name, phone: customer.phone, rates: rows };
}

/**
 * The customers screen: a searchable list, and one customer's details.
 *
 * The search matches the name or the phone number. `customers_phone_key` covers
 * an exact phone number; the name match is a scan, which is the right trade for
 * a table that gains a row per new customer and is read by one person at a time.
 */
export async function getCustomers(query?: string, selectedId?: string): Promise<CustomersData> {
  const term = query?.trim() ?? "";
  const where = term ? or(ilike(customers.name, `%${term}%`), ilike(customers.phone, `%${term}%`)) : undefined;

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      rates: count(customerSpecialRates.serviceId),
    })
    .from(customers)
    .leftJoin(customerSpecialRates, eq(customerSpecialRates.customerId, customers.id))
    .where(where)
    .groupBy(customers.id, customers.name, customers.phone)
    .orderBy(asc(customers.name))
    .limit(PAGE + 1);

  const more = rows.length > PAGE;
  const list: CustomerRow[] = rows.slice(0, PAGE);

  // An id from the query string may not be in this list (a stale link, or a
  // search that no longer matches), so the detail is asked for on its own.
  const wanted = selectedId ?? list[0]?.id;
  const selected = wanted ? await detailOf(wanted) : null;

  return { list, selected, query: term, more };
}
