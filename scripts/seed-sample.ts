/**
 * Loads the prototype's sample data (services, deals, staff, two customers)
 * and opens today as the first business day. Safe to run again: it does
 * nothing if services already exist.
 *
 *   pnpm db:seed:sample
 */
import { count } from "drizzle-orm";
import { db } from "../src/db";
import {
  businessDays,
  customers,
  customerSpecialRates,
  dealItems,
  deals,
  services,
  staff,
} from "../src/db/schema";
import { todayInKarachi } from "../src/lib/business-date";

const SERVICES = [
  { key: "hc", name: "Haircut", category: "Hair", price: 800, minutes: 30 },
  { key: "kc", name: "Kids haircut", category: "Hair", price: 500, minutes: 20 },
  { key: "col", name: "Hair color", category: "Hair", price: 1500, minutes: 60 },
  { key: "wash", name: "Hair wash", category: "Hair", price: 300, minutes: 10 },
  { key: "bd", name: "Beard trim", category: "Beard", price: 400, minutes: 15 },
  { key: "sh", name: "Shave", category: "Beard", price: 300, minutes: 15 },
  { key: "fc", name: "Facial", category: "Facial", price: 1800, minutes: 45 },
  { key: "dfc", name: "Deep facial", category: "Facial", price: 2500, minutes: 60 },
];

const DEALS = [
  { name: "VIP deal", price: 2000, items: ["hc", "bd", "fc"] },
  { name: "Basic deal", price: 1000, items: ["hc", "bd"] },
];

const STAFF = [
  { name: "Arshad", payType: 2, salary: 40000, dailyWage: 0, commissionRate: 10 },
  { name: "Hamid", payType: 2, salary: 40000, dailyWage: 0, commissionRate: 10 },
  { name: "Sherry", payType: 3, salary: 0, dailyWage: 800, commissionRate: 10 },
];

async function main() {
  const [{ value }] = await db.select({ value: count() }).from(services);
  if (value > 0) {
    console.log("skip: services already exist");
    process.exit(0);
  }

  const serviceIds: Record<string, string> = {};
  for (const { key, ...row } of SERVICES) {
    const [created] = await db.insert(services).values(row).returning({ id: services.id });
    serviceIds[key] = created.id;
  }

  for (const { items, ...row } of DEALS) {
    const [deal] = await db.insert(deals).values(row).returning({ id: deals.id });
    await db.insert(dealItems).values(items.map((key) => ({ dealId: deal.id, serviceId: serviceIds[key] })));
  }

  for (const row of STAFF) {
    await db.insert(staff).values(row);
  }

  const [ashfaq] = await db
    .insert(customers)
    .values({ phone: "03001234567", name: "Ashfaq Bhai" })
    .returning({ id: customers.id });
  await db.insert(customerSpecialRates).values({ customerId: ashfaq.id, serviceId: serviceIds.hc, price: 1500 });
  await db.insert(customers).values({ phone: "03217654321", name: "Kamran" });

  await db.insert(businessDays).values({ businessDate: todayInKarachi(), openingCash: 5000 });

  console.log(`loaded ${SERVICES.length} services, ${DEALS.length} deals, ${STAFF.length} staff, 2 customers`);
  console.log(`opened business day ${todayInKarachi()} with opening cash Rs 5,000`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
