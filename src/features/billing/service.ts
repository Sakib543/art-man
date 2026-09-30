import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { writeCancellation } from "@/db/bill-cancel";
import type { Tx } from "@/db/day-settlement";
import { getOpenBusinessDay } from "@/db/queries/business-day";
import { getCatalogVersion } from "@/db/queries/catalog";
import { lateArrivalNote } from "@/db/queries/offline-work";
import {
  auditLog,
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
import { isUniqueViolation, UserError } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { SLIP_NO_REPEATED } from "@/lib/offline/slip";
import { draftLinesOf, restoreSaved, type SavedBillLine } from "./bill-draft";
import { findBillByClientId, findSlipClash, type SlipClash } from "./queries";
import type { CreateBillInput, DiscardOfflineBillInput, EditBillInput, OfflineOrigin, SyncBillInput } from "./schemas";
import type { Receipt, SavedBill } from "./types";

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
async function priceBill(
  input: CreateBillInput,
  /**
   * The bill being corrected, as it was saved (P3.14). Its deals keep the
   * split they were sold with; it is read from the database by the caller,
   * never from the browser, so a correction cannot be used to move
   * commission between karigars.
   */
  original?: { lines: SavedBillLine[]; discount: Rupees },
): Promise<PricedBill> {
  const idsOf = (pick: (line: { serviceId: string | null; dealId: string | null }) => string | null) => [
    ...new Set([...input.lines, ...(original?.lines ?? [])].flatMap((line) => pick(line) ?? [])),
  ];
  // The original's services and deals are loaded too, to work out its split.
  const serviceIds = idsOf((line) => line.serviceId);
  const dealIds = idsOf((line) => line.dealId);
  const staffIds = [...new Set(input.lines.map((line) => line.staffId))];
  const inBill = new Set(input.lines.flatMap((line) => [line.serviceId, line.dealId]).filter(Boolean));

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
  // Only what the bill charges now must be active; a service the correction
  // dropped may have been switched off since.
  if ([...serviceRows, ...dealRows].some((row) => inBill.has(row.id) && !row.active)) {
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
  if (original) {
    catalog.dealSplits = restoreSaved(
      draftLinesOf(original.lines),
      original.lines.map((line) => line.amount),
      original.discount,
      catalog,
    ).dealSplits;
  }

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
      // Unique: a second insert with the same id fails, and the caller answers
      // with the bill already saved under it (P3.15).
      clientId: input.clientId,
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
    bookNo: bill.bookNo,
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

/**
 * The bill this id was already saved as, when it was (P3.15). A Save whose
 * answer was lost is sent again with the same id, and gets the bill that is
 * there instead of a second one.
 */
async function savedEarlier(clientId: string | null): Promise<SavedBill | null> {
  if (!clientId) return null;
  const receipt = await findBillByClientId(clientId);
  return receipt ? { receipt, alreadySaved: true } : null;
}

/**
 * Two requests with the same id can both get past `savedEarlier` before
 * either has committed. The second then fails on a unique index — on
 * `bills.client_id`, or earlier on a new customer's phone, which is written
 * before the bill — and lands here, to answer with the bill that got in.
 * Any other failure is passed on unchanged.
 */
async function lostTheRace(error: unknown, clientId: string | null): Promise<SavedBill> {
  if (isUniqueViolation(error)) {
    const earlier = await savedEarlier(clientId);
    if (earlier) return earlier;
  }
  throw error;
}

/**
 * Price a bill made offline (P2.2c). It is priced as any other bill — by
 * today's catalog, never by the browser's figures — so if a price moved while
 * the counter was offline, the payment no longer matches and the bill is
 * refused. That refusal says so, because "Payment is Rs 100 short" alone would
 * send the counter looking for a mistake it did not make.
 */
async function priceOffline(input: CreateBillInput, offline: OfflineOrigin): Promise<PricedBill> {
  try {
    return await priceBill(input);
  } catch (error) {
    if (!(error instanceof UserError) || offline.catalogVersion === null) throw error;
    if ((await getCatalogVersion()) === offline.catalogVersion) throw error;
    throw new UserError(`Prices have changed since this bill was made offline. ${error.message}`);
  }
}

/**
 * A slip's number that another bill in force already carries (P7.10, QA-28).
 * A Save from the screen is refused once, naming that bill, and saved when the
 * counter says to save it anyway (`repeatBookNo`): two slips can share a
 * number — a new paper book starting again at 1 — but the same slip entered
 * twice is a sale counted twice. A bill made offline is never refused for it:
 * the slip is in the customer's hand and its money in the drawer. Either way
 * the audit entry names the other bill, and the day's lists mark both.
 */
async function checkSlipNo(
  input: CreateBillInput,
  businessDate: string,
  exceptBillId: string | null,
  offline?: OfflineOrigin,
): Promise<SlipClash | null> {
  if (!input.bookNo) return null;
  const clash = await findSlipClash(input.bookNo, businessDate, exceptBillId);
  if (clash && !offline && !input.repeatBookNo) {
    const where = clash.businessDate === businessDate ? "today" : `of ${formatDate(clash.businessDate)}`;
    throw new UserError(
      `Bill book number ${input.bookNo} is already on bill #${clash.billNo} ${where}. If this is the same slip, it is in already; if it is another slip with the same number, save it anyway.`,
      SLIP_NO_REPEATED,
    );
  }
  return clash;
}

/** What an audit entry keeps of a repeated slip number: the bill that had it first. */
const repeatedOf = (clash: SlipClash | null) =>
  clash ? { repeatedBookNo: { billNo: clash.billNo, businessDate: clash.businessDate } } : {};

/**
 * Save a bill — once, however many times the same bill is sent (P3.15).
 *
 * `offline` is set when the bill was made with no server and sent later by the
 * sync (P2.2c). Such a bill goes into the day it was made on or nowhere: put
 * into whichever day happens to be open when the connection comes back, its
 * money would land in the wrong day's cash count. The id check comes first, so
 * a bill that did arrive — a send whose answer was lost — is answered with
 * itself even after its day has closed.
 */
export async function createBill(user: SessionUser, input: CreateBillInput, offline?: OfflineOrigin): Promise<SavedBill> {
  const earlier = await savedEarlier(input.clientId);
  if (earlier) return earlier;

  const day = await getOpenBusinessDay();
  if (!day || (offline && offline.businessDate !== day.businessDate)) {
    // Arriving after its day was closed — on another computer (P7.10) — says so.
    const late = offline ? await lateArrivalNote(offline.businessDate, "bill") : "";
    if (!day) throw new UserError(`No business day is open. Ask the Owner to open one.${late}`);
    throw new UserError(
      `This bill was made on ${formatDate(offline!.businessDate)}, but the open day is ${formatDate(day.businessDate)}. A bill made offline is only saved into the day it was made on.${late}`,
    );
  }

  const priced = offline ? await priceOffline(input, offline) : await priceBill(input);
  const repeated = await checkSlipNo(input, day.businessDate, null, offline);
  const actor = actorOf(user);

  try {
    const receipt = await db.transaction(async (tx) => {
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
          ...repeatedOf(repeated),
          // Made with no server (P2.2c): when, by whom — as the browser tells
          // it — and against which prices. The bill's own time is when it
          // reached the server. Since P7.10 also the day, the id and the
          // computer, which is how a second computer offline is noticed
          // (`db/queries/offline-work.ts`).
          ...(offline
            ? {
                offline: {
                  madeAt: offline.madeAt,
                  madeBy: offline.madeBy,
                  catalogVersion: offline.catalogVersion,
                  businessDate: offline.businessDate,
                  clientId: input.clientId,
                  ...(offline.device ? { device: offline.device } : {}),
                },
              }
            : {}),
        },
      });

      return receiptOf(bill, priced, input);
    });
    return { receipt, alreadySaved: false };
  } catch (error) {
    return lostTheRace(error, input.clientId);
  }
}

/** How much of what the browser sent a refusal keeps, at most. */
const REFUSAL_RECORD_LIMIT = 20_000;

/**
 * A bill made offline that the server refused goes to the audit log (P2.2c).
 * Its money was taken at the counter, so the server keeps a note of it even
 * though the books do not have it: the Owner can see what was refused and
 * why, and the bill it later becomes shares its id (`target`).
 */
export async function recordOfflineRefusal(user: SessionUser, clientId: string | null, reason: string, sent: unknown) {
  const text = JSON.stringify(sent) ?? "";
  await writeAudit(db, {
    actor: actorOf(user),
    action: "bill.offline-refuse",
    target: clientId ? `offline bill ${clientId}` : "offline bill",
    after: { reason, sent: text.length <= REFUSAL_RECORD_LIMIT ? sent : `(${text.length} characters, not kept)` },
    success: false,
  });
}

/**
 * Save a bill the counter made offline, sent by the sync (P2.2c) — through
 * `createBill`, with where it came from. A refusal is recorded before it is
 * passed on.
 */
export async function syncOfflineBill(user: SessionUser, input: SyncBillInput): Promise<SavedBill> {
  const { clientId, bill, businessDate, catalogVersion, madeAt, madeBy, device } = input;
  try {
    return await createBill(user, { ...bill, clientId }, { businessDate, catalogVersion, madeAt, madeBy, device });
  } catch (error) {
    if (error instanceof UserError) await recordOfflineRefusal(user, clientId, error.message, input);
    throw error;
  }
}

/**
 * A bill made offline that the server refused, taken off the counter's list by
 * a person, with a reason (P2.2c). Nothing reaches the books — the bill never
 * did — but it goes to the audit log as the counter kept it, so it does not
 * vanish without a trace.
 *
 * If a send whose answer was lost had saved it after all, it is in the books
 * and there is nothing to discard: its receipt is returned instead, and
 * nothing is written.
 *
 * Written once per bill. A Remove sent again — its answer lost, or pressed a
 * second time before the button could show it was busy — finds the first
 * record and writes no other. (Found while verifying P2.2c: a pane that was
 * not drawing let a second press through, and one bill was discarded twice.)
 */
export async function discardOfflineBill(user: SessionUser, input: DiscardOfflineBillInput): Promise<Receipt | null> {
  const saved = await findBillByClientId(input.clientId);
  if (saved) return saved;

  const action = "bill.offline-discard";
  const target = `offline bill ${input.clientId}`;
  // `audit_log_action_target_created_at_idx` answers this.
  const [already] = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(and(eq(auditLog.action, action), eq(auditLog.target, target)))
    .limit(1);
  if (already) return null;

  await writeAudit(db, { actor: actorOf(user), action, target, after: { reason: input.reason, entry: input.entry } });
  return null;
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
export async function editBill(user: SessionUser, input: EditBillInput): Promise<SavedBill> {
  if (!atLeastOwner(user.role)) throw new UserError("Only the Owner can edit a bill.");

  // Before the guards below: a correction sent again after its answer was
  // lost would otherwise be told "already cancelled" — true, by itself (P3.15).
  const earlier = await savedEarlier(input.clientId);
  if (earlier) return earlier;

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
  const priced = await priceBill(input, { lines: originalLines, discount: original.discount });
  // The bill being corrected hands its slip's number on; any other bill with it is a clash.
  const repeated = await checkSlipNo(input, day.businessDate, original.id);
  const actor = actorOf(user);

  try {
    const receipt = await db.transaction(async (tx) => {
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
          ...repeatedOf(repeated),
        },
      });

      return receiptOf(bill, priced, input);
    });
    return { receipt, alreadySaved: false };
  } catch (error) {
    // A racing twin of this correction trips over the cancellation's primary
    // key rather than `client_id`; both are unique violations, and both are
    // answered with the correction that got in.
    return lostTheRace(error, input.clientId);
  }
}
