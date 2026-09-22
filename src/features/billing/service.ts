import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { getOpenBusinessDay } from "@/db/queries/business-day";
import {
  billLines,
  bills,
  customerSpecialRates,
  customers,
  dealItems,
  deals,
  services,
  staff,
} from "@/db/schema";
import { checkPayment, priceCart, PricingError, type PricingCatalog } from "@/lib/accounting";
import type { SessionUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import type { CreateBillInput } from "./schemas";
import type { Receipt } from "./types";

const NOTE_TEXT = { "special-rate": "Special rate", "deal-share": "Deal share" } as const;

/**
 * Save a bill. The price of every line is worked out here from the database;
 * amounts sent by the browser are never used.
 */
export async function createBill(user: SessionUser, input: CreateBillInput): Promise<Receipt> {
  const day = await getOpenBusinessDay();
  if (!day) throw new UserError("No business day is open. Ask the Owner to open one.");

  const serviceIds = [...new Set(input.lines.map((line) => line.serviceId))];
  const dealIds = [...new Set(input.lines.flatMap((line) => (line.dealId ? [line.dealId] : [])))];
  const staffIds = [...new Set(input.lines.map((line) => line.staffId))];

  const [serviceRows, dealRows, dealItemRows, staffRows] = await Promise.all([
    db.select().from(services).where(inArray(services.id, serviceIds)),
    dealIds.length ? db.select().from(deals).where(inArray(deals.id, dealIds)) : [],
    dealIds.length ? db.select().from(dealItems).where(inArray(dealItems.dealId, dealIds)) : [],
    db.select({ id: staff.id, name: staff.name, active: staff.active }).from(staff).where(inArray(staff.id, staffIds)),
  ]);

  if (staffRows.length !== staffIds.length || staffRows.some((row) => !row.active)) {
    throw new UserError("One of the chosen staff members is not available");
  }
  if (serviceRows.some((row) => !row.active) || dealRows.some((row) => !row.active)) {
    throw new UserError("A service or deal in this bill is no longer active");
  }

  // The customer, if a phone number was given. A new number needs a name.
  let customerId: string | null = null;
  let customerName: string | null = null;
  let specialRates: Record<string, number> = {};
  if (input.customer) {
    const [existing] = await db.select().from(customers).where(eq(customers.phone, input.customer.phone)).limit(1);
    if (existing) {
      customerId = existing.id;
      customerName = existing.name;
      const rates = await db.select().from(customerSpecialRates).where(eq(customerSpecialRates.customerId, existing.id));
      specialRates = Object.fromEntries(rates.map((rate) => [rate.serviceId, rate.price]));
    } else if (input.customer.name) {
      customerName = input.customer.name;
    } else {
      throw new UserError("Enter the customer's name to save a new customer");
    }
  }

  const catalog: PricingCatalog = {
    services: Object.fromEntries(serviceRows.map((row) => [row.id, { id: row.id, name: row.name, price: row.price }])),
    deals: Object.fromEntries(
      dealRows.map((row) => [
        row.id,
        {
          id: row.id,
          name: row.name,
          price: row.price,
          serviceIds: dealItemRows.filter((item) => item.dealId === row.id).map((item) => item.serviceId),
        },
      ]),
    ),
    specialRates,
  };

  let priced;
  try {
    priced = priceCart(input.lines, catalog);
  } catch (error) {
    if (error instanceof PricingError) throw new UserError(error.message);
    throw error;
  }

  const payment = checkPayment(priced.total, input.cash, input.online);
  if (!payment.ok) {
    throw new UserError(
      payment.remaining > 0
        ? `Payment is Rs ${payment.remaining} short of the total`
        : `Payment is Rs ${-payment.remaining} more than the total`,
    );
  }

  const staffName = new Map(staffRows.map((row) => [row.id, row.name]));

  return db.transaction(async (tx) => {
    if (!customerId && input.customer && input.customer.name) {
      const [created] = await tx
        .insert(customers)
        .values({ phone: input.customer.phone, name: input.customer.name })
        .returning({ id: customers.id });
      customerId = created.id;
    }

    const [bill] = await tx
      .insert(bills)
      .values({
        businessDate: day.businessDate,
        customerId,
        cash: input.cash,
        online: input.online,
        bookNo: input.bookNo,
        createdBy: user.username || user.name,
      })
      .returning();

    await tx.insert(billLines).values(
      priced.lines.map((line) => ({
        billId: bill.id,
        serviceId: line.serviceId,
        dealId: line.dealId,
        name: line.name,
        amount: line.amount,
        staffId: line.staffId!,
      })),
    );

    await writeAudit(tx, {
      actor: user.username || user.name,
      action: "bill.create",
      target: `bill #${bill.billNo}`,
      after: { total: priced.total, cash: input.cash, online: input.online, bookNo: input.bookNo },
    });

    return {
      billNo: bill.billNo,
      createdAt: bill.createdAt.toISOString(),
      businessDate: bill.businessDate,
      customerName,
      lines: priced.lines.map((line) => ({
        name: line.name,
        amount: line.amount,
        staffName: staffName.get(line.staffId!) ?? "",
        note: line.note ? NOTE_TEXT[line.note] : null,
      })),
      total: priced.total,
      cash: input.cash,
      online: input.online,
    };
  });
}
