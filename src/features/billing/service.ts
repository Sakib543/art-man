import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { writeCancellation } from "@/db/bill-cancel";
import type { Tx } from "@/db/day-settlement";
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
import {
  checkPayment,
  priceCart,
  PricingError,
  type PricedLine,
  type PricingCatalog,
  type Rupees,
} from "@/lib/accounting";
import { atLeastOwner } from "@/lib/auth/roles";
import type { SessionUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import type { CreateBillInput, EditBillInput } from "./schemas";
import type { Receipt } from "./types";

const NOTE_TEXT: Record<string, string | undefined> = {
  "special-rate": "Special rate",
  "deal-share": "Deal share",
  // "chosen" says nothing useful: the amount box beside it already shows that
  // the counter picked a figure, and the range is written under it (P3.11).
};

const actorOf = (user: SessionUser) => user.username || user.name;

/** Everything settled before the transaction opens: prices, the customer, staff names. */
interface PricedBill {
  lines: PricedLine[];
  /** Before the discount. The lines below are already net of it (P3.10). */
  subtotal: Rupees;
  discount: Rupees;
  total: Rupees;
  /** An existing customer, or null for a walk-in or one still to be created. */
  customerId: string | null;
  newCustomer: { phone: string; name: string } | null;
  customerName: string | null;
  staffName: Map<string, string>;
}

/**
 * Work out what to charge. The price of every line is decided here from the
 * database; amounts sent by the browser are never used — except on an "Other"
 * line (P3.12), whose whole point is that the counter names the price.
 */
async function priceBill(input: CreateBillInput): Promise<PricedBill> {
  const serviceIds = [...new Set(input.lines.flatMap((line) => (line.serviceId ? [line.serviceId] : [])))];
  const dealIds = [...new Set(input.lines.flatMap((line) => (line.dealId ? [line.dealId] : [])))];
  const staffIds = [...new Set(input.lines.map((line) => line.staffId))];

  const [serviceRows, dealRows, dealItemRows, staffRows] = await Promise.all([
    // A bill of nothing but Other lines names no service at all.
    serviceIds.length ? db.select().from(services).where(inArray(services.id, serviceIds)) : [],
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
  let newCustomer: { phone: string; name: string } | null = null;
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
      newCustomer = { phone: input.customer.phone, name: input.customer.name };
    } else {
      throw new UserError("Enter the customer's name to save a new customer");
    }
  }

  const catalog: PricingCatalog = {
    services: Object.fromEntries(serviceRows.map((row) => [row.id, { id: row.id, name: row.name, price: row.price, maxPrice: row.maxPrice }])),
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
    priced = priceCart(input.lines, catalog, input.discount);
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

  return {
    lines: priced.lines,
    subtotal: priced.subtotal,
    discount: priced.discount,
    total: priced.total,
    customerId,
    newCustomer,
    customerName,
    staffName: new Map(staffRows.map((row) => [row.id, row.name])),
  };
}

/**
 * Insert the bill and its lines. Runs inside the caller's transaction.
 * `supersedesBillId` is set only on the corrected bill of an edit (P1.4), so
 * the Daily report can fold the correction into one row (P1.5).
 */
async function writeBill(
  tx: Tx,
  businessDate: string,
  actor: string,
  input: CreateBillInput,
  priced: PricedBill,
  supersedesBillId: string | null = null,
) {
  let customerId = priced.customerId;
  if (!customerId && priced.newCustomer) {
    const [created] = await tx.insert(customers).values(priced.newCustomer).returning({ id: customers.id });
    customerId = created.id;
  }

  const [bill] = await tx
    .insert(bills)
    .values({
      businessDate,
      customerId,
      cash: input.cash,
      online: input.online,
      bookNo: input.bookNo,
      // Kept for the receipt and the reports only: the line amounts are
      // already net of it, and every total is built from those (P3.10).
      discount: priced.discount,
      discountReason: priced.discount > 0 ? input.discountReason : null,
      supersedesBillId,
      createdBy: actor,
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

  return bill;
}

function receiptOf(bill: typeof bills.$inferSelect, priced: PricedBill, input: CreateBillInput): Receipt {
  return {
    billNo: bill.billNo,
    createdAt: bill.createdAt.toISOString(),
    businessDate: bill.businessDate,
    customerName: priced.customerName,
    lines: priced.lines.map((line) => ({
      name: line.name,
      amount: line.amount,
      staffName: priced.staffName.get(line.staffId!) ?? "",
      note: (line.note ? NOTE_TEXT[line.note] : null) ?? null,
    })),
    subtotal: priced.subtotal,
    discount: priced.discount,
    total: priced.total,
    cash: input.cash,
    online: input.online,
  };
}

/** The Other lines of a bill, for its audit entry — nothing when it has none. */
function otherLinesOf(priced: PricedBill): { other?: { name: string; amount: Rupees }[] } {
  const other = priced.lines.filter((line) => line.serviceId === null);
  return other.length ? { other: other.map((line) => ({ name: line.name, amount: line.amount })) } : {};
}

/** What the audit log keeps of a bill's contents, so a correction is readable later. */
const auditLines = (lines: { name: string; amount: number; staffId: string | null }[]) =>
  lines.map((line) => ({ name: line.name, amount: line.amount, staffId: line.staffId }));

/** Save a bill. */
export async function createBill(user: SessionUser, input: CreateBillInput): Promise<Receipt> {
  const day = await getOpenBusinessDay();
  if (!day) throw new UserError("No business day is open. Ask the Owner to open one.");

  const priced = await priceBill(input);
  const actor = actorOf(user);

  return db.transaction(async (tx) => {
    const bill = await writeBill(tx, day.businessDate, actor, input, priced);

    await writeAudit(tx, {
      actor,
      action: "bill.create",
      target: `bill #${bill.billNo}`,
      after: {
        total: priced.total,
        cash: input.cash,
        online: input.online,
        bookNo: input.bookNo,
        // A discount is the counter's own decision, so it is written down with
        // its reason even though the line amounts already carry it.
        ...(priced.discount > 0 ? { discount: priced.discount, discountReason: input.discountReason } : {}),
        // So is an Other line's price (P3.12): it is the one amount the catalog
        // did not decide.
        ...otherLinesOf(priced),
      },
    });

    return receiptOf(bill, priced, input);
  });
}

/**
 * Correct a bill of the day that is still open (P1.4, Owner only).
 *
 * Nothing about the open day has been settled — no snapshot, no security code,
 * and commission is not posted to the khata until the close — so a correction
 * needs no unwinding. It is still recorded the way this system records
 * everything: the old bill is cancelled, a reversal undoes its amounts, and the
 * corrected bill is saved beside them, all in one transaction. The daily report
 * shows three lines for one correction, which is the point (spec 11): the
 * mistake stays visible and the totals still add up.
 *
 * A bill in a day that is already closed cannot be edited, only cancelled.
 */
export async function editBill(user: SessionUser, input: EditBillInput): Promise<Receipt> {
  if (!atLeastOwner(user.role)) throw new UserError("Only the Owner can edit a bill.");

  const day = await getOpenBusinessDay();
  if (!day) throw new UserError("No business day is open, so there is nothing to correct.");

  const [original] = await db.select().from(bills).where(eq(bills.id, input.billId)).limit(1);
  if (!original) throw new UserError("Bill not found");
  if (original.reversesBillId) throw new UserError("A reversal bill cannot be edited");
  if (original.businessDate !== day.businessDate) {
    throw new UserError("This bill belongs to a day that is already closed. It can only be cancelled, not edited.");
  }

  const [cancelled] = await db
    .select()
    .from(billCancellations)
    .where(eq(billCancellations.billId, original.id))
    .limit(1);
  if (cancelled) throw new UserError("This bill is already cancelled");

  const originalLines = await db.select().from(billLines).where(eq(billLines.billId, original.id));
  const priced = await priceBill(input);
  const actor = actorOf(user);

  return db.transaction(async (tx) => {
    const reversalBillNo = await writeCancellation(tx, original, originalLines, `Edited: ${input.reason}`, actor);
    const bill = await writeBill(tx, day.businessDate, actor, input, priced, original.id);

    // Both versions go to the audit log, so the bill as it was stays readable
    // even though the row itself was never touched.
    await writeAudit(tx, {
      actor,
      action: "bill.edit",
      target: `bill #${original.billNo}`,
      before: {
        billNo: original.billNo,
        total: original.cash + original.online,
        cash: original.cash,
        online: original.online,
        bookNo: original.bookNo,
        lines: auditLines(originalLines),
      },
      after: {
        billNo: bill.billNo,
        reversalBillNo,
        reason: input.reason,
        total: priced.total,
        cash: input.cash,
        online: input.online,
        bookNo: input.bookNo,
        lines: auditLines(priced.lines),
      },
    });

    return receiptOf(bill, priced, input);
  });
}
