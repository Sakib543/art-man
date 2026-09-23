import { asc } from "drizzle-orm";
import { db } from "@/db";
import { dealItems, deals, services, staff } from "@/db/schema";
import type { PayType } from "@/lib/accounting";
import type { DealRow, ServiceRow, StaffRow } from "./types";

export async function getStaffList(): Promise<StaffRow[]> {
  const rows = await db
    .select({
      id: staff.id,
      name: staff.name,
      payType: staff.payType,
      salary: staff.salary,
      dailyWage: staff.dailyWage,
      commissionRate: staff.commissionRate,
      active: staff.active,
    })
    .from(staff)
    .orderBy(asc(staff.createdAt), asc(staff.name));

  return rows.map((row) => ({ ...row, payType: row.payType as PayType }));
}

export async function getServiceList(): Promise<ServiceRow[]> {
  return db
    .select({
      id: services.id,
      name: services.name,
      category: services.category,
      price: services.price,
      maxPrice: services.maxPrice,
      minutes: services.minutes,
      active: services.active,
    })
    .from(services)
    .orderBy(asc(services.createdAt), asc(services.name));
}

export async function getDealList(): Promise<DealRow[]> {
  const [dealRows, itemRows] = await Promise.all([
    db.select().from(deals).orderBy(asc(deals.createdAt), asc(deals.name)),
    db.select().from(dealItems),
  ]);

  return dealRows.map(({ id, name, price, active }) => ({
    id,
    name,
    price,
    active,
    serviceIds: itemRows.filter((item) => item.dealId === id).map((item) => item.serviceId),
  }));
}
