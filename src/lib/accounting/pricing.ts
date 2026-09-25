import { allocate } from "./allocate";
import { splitDealPrice } from "./deal";
import type { Rupees } from "./types";

/**
 * Pricing a cart. The server uses this to decide what to charge (it never
 * trusts amounts from the browser); the screen uses the same function for the
 * live total, so what the cashier sees is what gets saved.
 */

export interface PricingService {
  id: string;
  name: string;
  /** The price, or the bottom of the range when `maxPrice` is set (P3.11). */
  price: Rupees;
  /** The top of the range, or null for one fixed price. */
  maxPrice: Rupees | null;
}

export interface PricingDeal {
  id: string;
  name: string;
  price: Rupees;
  serviceIds: string[];
}

/**
 * An "Other" line (P3.12): extra work the list has no service for, charged
 * whatever the counter types. It is the one line whose amount comes from the
 * browser by design, so it is written down: the line's name says "Other" on
 * every receipt, report and khata, and the bill's audit entry lists it.
 */
export const OTHER_LINE = "Other";

/** The most one Other line may charge — a guard against a slipped key, not a price rule. */
export const OTHER_MAX = 100_000;

/** "Other", or "Other: Beard shape" when the counter said what it was. */
export function otherLineName(description: string | null | undefined): string {
  const text = description?.trim();
  return text ? `${OTHER_LINE}: ${text}` : OTHER_LINE;
}

/** The description back out of a saved line's name, for re-opening a bill. */
export function otherDescriptionOf(name: string): string {
  if (name === OTHER_LINE) return "";
  return name.startsWith(`${OTHER_LINE}: `) ? name.slice(OTHER_LINE.length + 2) : name;
}

export interface CartLineInput {
  /** Null on an "Other" line (P3.12), which has no service behind it. */
  serviceId: string | null;
  staffId: string | null;
  /** Set when the line came from a deal. All lines of one deal share `dealInstanceId`. */
  dealId: string | null;
  dealInstanceId: string | null;
  /**
   * What the counter chose to charge for this line (P3.11). It is read **only**
   * for a service that has a price range and is not part of a deal and has no
   * special rate — everywhere else the price is the catalog's to decide, and a
   * figure sent by the browser is ignored rather than trusted.
   */
  amount?: Rupees | null;
  /** What an "Other" line was for, when the counter said. Ignored on every other line. */
  description?: string | null;
}

export type PriceNote = "special-rate" | "deal-share" | "chosen" | null;

export interface PricedLine extends CartLineInput {
  name: string;
  /** Amount actually charged. Commission is based on this, not the list price. */
  amount: Rupees;
  note: PriceNote;
}

export interface PricingCatalog {
  services: Record<string, PricingService>;
  deals: Record<string, PricingDeal>;
  /** The customer's fixed prices, by service id. Empty for walk-ins. */
  specialRates: Record<string, Rupees>;
  /**
   * How a deal instance's price was split when the bill was first rung up,
   * by deal instance id and then service id (P3.14). Set only when a bill is
   * re-opened for correction, and on the server only ever worked out from the
   * bill as it was saved — never taken from the browser — so a correction
   * keeps the split the sale had instead of re-splitting by today's list
   * prices. An instance not in here, or whose split no longer adds up to the
   * deal's price, is split by list price as usual.
   */
  dealSplits?: Record<string, Record<string, Rupees>>;
}

/** A kept split is used only if it still describes this deal exactly. */
function keptSplit(deal: PricingDeal, kept: Record<string, Rupees> | undefined): Rupees[] | null {
  if (!kept) return null;
  const parts = deal.serviceIds.map((id) => kept[id]);
  const whole = parts.every((part) => Number.isInteger(part) && part >= 0);
  if (!whole || Object.keys(kept).length !== deal.serviceIds.length) return null;
  return parts.reduce((sum, part) => sum + part, 0) === deal.price ? parts : null;
}

export class PricingError extends Error {}

export interface PricedCart {
  lines: PricedLine[];
  /** What the services come to before any discount. */
  subtotal: Rupees;
  /** Money taken off at the counter (backlog P3.10). 0 on most bills. */
  discount: Rupees;
  /** What the customer pays, and what cash + online must add up to. */
  total: Rupees;
}

/**
 * @param discount whole rupees off the whole bill. It is **shared across the
 * lines** rather than kept aside, because commission is charged on the amount
 * actually charged (spec §10.1) and every downstream figure — the karigar's
 * commission, the khata, the day's sale, the month's profit — is built from
 * line amounts. Splitting it here is what makes all of them follow without a
 * single one of them knowing that discounts exist.
 */
export function priceCart(
  lines: CartLineInput[],
  catalog: PricingCatalog,
  discount: Rupees = 0,
): PricedCart {
  // A deal's price is split across its services, once per deal instance.
  const dealShares = new Map<string, Record<string, Rupees>>();
  const dealGroups = new Map<string, CartLineInput[]>();

  for (const line of lines) {
    if (line.dealId && line.dealInstanceId) {
      const group = dealGroups.get(line.dealInstanceId) ?? [];
      group.push(line);
      dealGroups.set(line.dealInstanceId, group);
    }
  }

  for (const [instanceId, group] of dealGroups) {
    const deal = catalog.deals[group[0].dealId!];
    if (!deal) throw new PricingError("Deal not found");

    const sameDeal = group.every((line) => line.dealId === deal.id);
    const sent = group.map((line) => line.serviceId ?? "").sort();
    const expected = [...deal.serviceIds].sort();
    if (!sameDeal || sent.join() !== expected.join()) {
      throw new PricingError(`${deal.name} is missing services or has extra ones`);
    }

    // The bottom of a range is the list price for splitting a deal: the deal's
    // own price is what the customer pays, so there is nothing to choose, and
    // the split only decides how it is shared between the services (P3.11).
    const listPrices = deal.serviceIds.map((id) => {
      const service = catalog.services[id];
      if (!service) throw new PricingError("Deal service not found");
      return service.price;
    });
    const parts = keptSplit(deal, catalog.dealSplits?.[instanceId]) ?? splitDealPrice(deal.price, listPrices);
    dealShares.set(instanceId, Object.fromEntries(deal.serviceIds.map((id, i) => [id, parts[i]])));
  }

  const priced = lines.map<PricedLine>((line) => {
    if (line.serviceId === null) {
      // An "Other" line (P3.12). Nothing in the catalog decides it: the amount
      // is the counter's. A blank one reads as 0 so the screen can keep a live
      // total while it is typed; the bill schema is what refuses to save a 0.
      if (line.dealId) throw new PricingError("An Other line cannot be part of a deal");
      const amount = line.amount ?? 0;
      if (!Number.isInteger(amount) || amount < 0) throw new PricingError("Other must be whole rupees");
      if (amount > OTHER_MAX) throw new PricingError(`Other can be at most Rs ${OTHER_MAX}`);
      return { ...line, name: otherLineName(line.description), amount, note: null };
    }

    const service = catalog.services[line.serviceId];
    if (!service) throw new PricingError("Service not found");

    if (line.dealId && line.dealInstanceId) {
      const share = dealShares.get(line.dealInstanceId)![line.serviceId];
      return { ...line, name: service.name, amount: share, note: "deal-share" };
    }

    // A price the Owner fixed for this customer beats the list and the range
    // alike: the counter chooses inside a range, never around a special rate.
    const special = catalog.specialRates[line.serviceId];
    if (special !== undefined) return { ...line, name: service.name, amount: special, note: "special-rate" };

    if (service.maxPrice === null) return { ...line, name: service.name, amount: service.price, note: null };

    // A range (P3.11). No choice made yet reads as the bottom of it, which is
    // also what the screen shows the moment the service is added.
    const chosen = line.amount ?? service.price;
    if (!Number.isInteger(chosen) || chosen < service.price || chosen > service.maxPrice) {
      throw new PricingError(
        `${service.name} must be between Rs ${service.price} and Rs ${service.maxPrice}`,
      );
    }
    return { ...line, name: service.name, amount: chosen, note: "chosen" };
  });

  const subtotal = priced.reduce((sum, line) => sum + line.amount, 0);
  if (discount === 0) return { lines: priced, subtotal, discount: 0, total: subtotal };

  if (!Number.isInteger(discount) || discount < 0) throw new PricingError("A discount is whole rupees, and never negative");
  // A bill of nothing cannot be discounted, and a bill cannot be given away:
  // every other screen assumes a bill was paid for, and `checkPayment` refuses
  // a total of 0 anyway. Saying so here gives the counter the real reason.
  if (discount >= subtotal) throw new PricingError(`A discount must be less than the bill total of Rs ${subtotal}`);

  // Largest-remainder, the same split a deal price gets: the shares add up to
  // exactly the discount, so no rupee appears or disappears. Each share is at
  // most its own line, so no line can go negative.
  const shares = allocate(discount, priced.map((line) => line.amount));
  const discounted = priced.map((line, index) => ({ ...line, amount: line.amount - shares[index] }));

  return { lines: discounted, subtotal, discount, total: subtotal - discount };
}

export type PayMode = "cash" | "online" | "split";

/** Cash and online amounts for a payment mode. Split uses what was typed in. */
export function paymentAmounts(
  mode: PayMode,
  total: Rupees,
  typed: { cash: Rupees; online: Rupees },
): { cash: Rupees; online: Rupees } {
  if (mode === "cash") return { cash: total, online: 0 };
  if (mode === "online") return { cash: 0, online: total };
  return typed;
}

export interface PaymentCheck {
  ok: boolean;
  /** Positive = still to collect, negative = overpaid. */
  remaining: Rupees;
}

export function checkPayment(total: Rupees, cash: Rupees, online: Rupees): PaymentCheck {
  const remaining = total - cash - online;
  return { ok: total > 0 && cash >= 0 && online >= 0 && remaining === 0, remaining };
}
