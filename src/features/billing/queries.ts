import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
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
import { priceCart, PricingError } from "@/lib/accounting";
import { draftLinesOf } from "./bill-draft";
import { lastVisitOf } from "./last-visit";
import type { BillDraft, BillingData, CustomerInfo } from "./types";

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
    services: serviceRows.map(({ id, name, category, price, maxPrice, minutes }) => ({ id, name, category, price, maxPrice, minutes })),
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
  return customer ? customerInfo(customer) : null;
}

async function findCustomerById(id: string): Promise<CustomerInfo | null> {
  const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return customer ? customerInfo(customer) : null;
}

/**
 * A bill that really happened: not a reversal, and not cancelled. Both halves
 * matter. A reversal is the mirror of the bill it undoes, and a cancelled bill
 * is work the customer did not pay for — counting either would tell the counter
 * that someone visited when they did not.
 *
 * Written as a condition rather than a filter so the visit count and the last
 * visit cannot drift apart: they are the same rule applied to the same join.
 */
const realVisit = (customerId: string) =>
  and(eq(bills.customerId, customerId), isNull(bills.reversesBillId), isNull(billCancellations.billId));

/** Visit count, the last visit with its services, and special rates for one customer. */
async function customerInfo(customer: typeof customers.$inferSelect): Promise<CustomerInfo> {
  const [[visit], [last], rates] = await Promise.all([
    db
      .select({ visits: count() })
      .from(bills)
      .leftJoin(billCancellations, eq(billCancellations.billId, bills.id))
      .where(realVisit(customer.id)),
    db
      .select({ id: bills.id, billNo: bills.billNo, businessDate: bills.businessDate })
      .from(bills)
      .leftJoin(billCancellations, eq(billCancellations.billId, bills.id))
      .where(realVisit(customer.id))
      // By business date, then bill number: several bills can share one day.
      .orderBy(desc(bills.businessDate), desc(bills.billNo))
      .limit(1),
    db.select().from(customerSpecialRates).where(eq(customerSpecialRates.customerId, customer.id)),
  ]);

  // `bill_lines` has no order column, so order by name — the same choice the
  // developer's edit screen makes, which keeps the two lists looking alike.
  const lines = last
    ? await db
        .select({ name: billLines.name, amount: billLines.amount, staffName: staff.name })
        .from(billLines)
        .innerJoin(staff, eq(billLines.staffId, staff.id))
        .where(eq(billLines.billId, last.id))
        .orderBy(asc(billLines.name))
    : [];

  return {
    id: customer.id,
    phone: customer.phone,
    name: customer.name,
    visits: visit.visits,
    lastVisit: lastVisitOf(last ?? null, lines),
    specialRates: Object.fromEntries(rates.map((rate) => [rate.serviceId, rate.price])),
  };
}

/**
 * Re-open a saved bill for correction (P1.4). The guards match `editBill`, so
 * the screen refuses for the same reasons the server would, with the reason in
 * words rather than an error after the Owner has retyped the bill.
 */
export async function getBillForEdit(billId: string, data: BillingData): Promise<BillDraft> {
  if (!z.uuid().safeParse(billId).success) return { ok: false, reason: "That link does not point at a bill." };

  const [bill] = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
  if (!bill) return { ok: false, reason: "That bill no longer exists." };
  if (bill.reversesBillId) return { ok: false, reason: "A reversal bill cannot be edited." };
  if (bill.businessDate !== data.businessDate) {
    return { ok: false, reason: "That bill belongs to a day that is already closed. It can only be cancelled, not edited." };
  }

  const [cancelled] = await db.select().from(billCancellations).where(eq(billCancellations.billId, bill.id)).limit(1);
  if (cancelled) return { ok: false, reason: `Bill #${bill.billNo} is already cancelled.` };

  const saved = await db
    .select({
      serviceId: billLines.serviceId,
      name: billLines.name,
      dealId: billLines.dealId,
      staffId: billLines.staffId,
      amount: billLines.amount,
    })
    .from(billLines)
    .where(eq(billLines.billId, bill.id));

  const lines = draftLinesOf(saved);
  const customer = bill.customerId ? await findCustomerById(bill.customerId) : null;

  // Price it against today's catalog before showing it. If a service or deal
  // has changed since the bill was rung up, say so now rather than let the
  // screen open with a total of 0 and no explanation.
  try {
    priceCart(lines, {
      services: Object.fromEntries(data.services.map((s) => [s.id, { id: s.id, name: s.name, price: s.price, maxPrice: s.maxPrice }])),
      deals: Object.fromEntries(data.deals.map((d) => [d.id, d])),
      specialRates: customer?.specialRates ?? {},
    });
  } catch (error) {
    if (error instanceof PricingError) {
      return {
        ok: false,
        reason: `Bill #${bill.billNo} cannot be re-opened: ${error.message}. Cancel it and enter a new bill instead.`,
      };
    }
    throw error;
  }

  return {
    ok: true,
    id: bill.id,
    billNo: bill.billNo,
    lines,
    customer,
    cash: bill.cash,
    online: bill.online,
    bookNo: bill.bookNo,
    // The discount comes back with the draft (P3.10) so a correction keeps it
    // unless the Owner changes it. Without this, re-opening a discounted bill
    // would quietly put the price back up.
    discount: bill.discount,
    discountReason: bill.discountReason,
  };
}
