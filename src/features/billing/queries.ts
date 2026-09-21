import { and, count, desc, eq, inArray, isNull, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { getOpenBusinessDay } from "@/db/queries/business-day";
import {
  billCancellations,
  billLines,
  bills,
  customerSpecialRates,
  customers,
  dealItems,
  deals,
  services,
  staff,
} from "@/db/schema";
import type { BillingData, CustomerInfo, ReceiptLine, TodaysBill } from "./types";

/** Everything the billing screen needs, or null when no business day is open. */
export async function getBillingData(): Promise<BillingData | null> {
  const day = await getOpenBusinessDay();
  if (!day) return null;

  const [serviceRows, dealRows, dealItemRows, staffRows, [{ next }]] = await Promise.all([
    db.select().from(services).where(eq(services.active, true)).orderBy(services.createdAt, services.name),
    db.select().from(deals).where(eq(deals.active, true)).orderBy(deals.name),
    db.select().from(dealItems),
    db.select({ id: staff.id, name: staff.name }).from(staff).where(eq(staff.active, true)).orderBy(staff.name),
    db.select({ next: sql<number>`coalesce(max(${bills.billNo}), 0) + 1` }).from(bills),
  ]);

  return {
    businessDate: day.businessDate,
    nextBillNo: Number(next),
    services: serviceRows.map(({ id, name, category, price, minutes }) => ({ id, name, category, price, minutes })),
    // A deal is only offered while every one of its services is active.
    deals: dealRows
      .map(({ id, name, price }) => ({
        id,
        name,
        price,
        serviceIds: dealItemRows.filter((item) => item.dealId === id).map((item) => item.serviceId),
      }))
      .filter((deal) => deal.serviceIds.every((serviceId) => serviceRows.some((s) => s.id === serviceId))),
    staff: staffRows,
  };
}

export async function findCustomer(phone: string): Promise<CustomerInfo | null> {
  const [customer] = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
  if (!customer) return null;

  const [[visit], rates] = await Promise.all([
    db
      .select({ visits: count(), last: max(bills.businessDate) })
      .from(bills)
      .where(and(eq(bills.customerId, customer.id), isNull(bills.reversesBillId))),
    db.select().from(customerSpecialRates).where(eq(customerSpecialRates.customerId, customer.id)),
  ]);

  return {
    id: customer.id,
    phone: customer.phone,
    name: customer.name,
    visits: visit.visits,
    lastVisit: visit.last,
    specialRates: Object.fromEntries(rates.map((rate) => [rate.serviceId, rate.price])),
  };
}

/** Bills of one business day, newest first, with lines and cancellation info. */
export async function getBillsForDay(businessDate: string): Promise<TodaysBill[]> {
  const rows = await db
    .select({
      id: bills.id,
      billNo: bills.billNo,
      createdAt: bills.createdAt,
      cash: bills.cash,
      online: bills.online,
      reversesBillId: bills.reversesBillId,
      customerName: customers.name,
      cancelReason: billCancellations.reason,
    })
    .from(bills)
    .leftJoin(customers, eq(bills.customerId, customers.id))
    .leftJoin(billCancellations, eq(billCancellations.billId, bills.id))
    .where(eq(bills.businessDate, businessDate))
    .orderBy(desc(bills.billNo));

  if (rows.length === 0) return [];

  const lineRows = await db
    .select({ billId: billLines.billId, name: billLines.name, amount: billLines.amount, staffName: staff.name })
    .from(billLines)
    .innerJoin(staff, eq(billLines.staffId, staff.id))
    .where(inArray(billLines.billId, rows.map((row) => row.id)));

  const billNoById = new Map(rows.map((row) => [row.id, row.billNo]));

  return rows.map((row) => {
    const lines: ReceiptLine[] = lineRows
      .filter((line) => line.billId === row.id)
      .map(({ name, amount, staffName }) => ({ name, amount, staffName, note: null }));

    return {
      id: row.id,
      billNo: row.billNo,
      createdAt: row.createdAt.toISOString(),
      customerName: row.customerName,
      total: row.cash + row.online,
      cash: row.cash,
      online: row.online,
      status: row.reversesBillId ? "reversal" : row.cancelReason ? "cancelled" : "active",
      cancelReason: row.cancelReason,
      reversesBillNo: row.reversesBillId ? (billNoById.get(row.reversesBillId) ?? null) : null,
      lines,
    };
  });
}
