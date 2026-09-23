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
  price: Rupees;
}

export interface PricingDeal {
  id: string;
  name: string;
  price: Rupees;
  serviceIds: string[];
}

export interface CartLineInput {
  serviceId: string;
  staffId: string | null;
  /** Set when the line came from a deal. All lines of one deal share `dealInstanceId`. */
  dealId: string | null;
  dealInstanceId: string | null;
}

export type PriceNote = "special-rate" | "deal-share" | null;

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
    const sent = group.map((line) => line.serviceId).sort();
    const expected = [...deal.serviceIds].sort();
    if (!sameDeal || sent.join() !== expected.join()) {
      throw new PricingError(`${deal.name} is missing services or has extra ones`);
    }

    const listPrices = deal.serviceIds.map((id) => {
      const service = catalog.services[id];
      if (!service) throw new PricingError("Deal service not found");
      return service.price;
    });
    const parts = splitDealPrice(deal.price, listPrices);
    dealShares.set(instanceId, Object.fromEntries(deal.serviceIds.map((id, i) => [id, parts[i]])));
  }

  const priced = lines.map<PricedLine>((line) => {
    const service = catalog.services[line.serviceId];
    if (!service) throw new PricingError("Service not found");

    if (line.dealId && line.dealInstanceId) {
      const share = dealShares.get(line.dealInstanceId)![line.serviceId];
      return { ...line, name: service.name, amount: share, note: "deal-share" };
    }

    const special = catalog.specialRates[line.serviceId];
    return special === undefined
      ? { ...line, name: service.name, amount: service.price, note: null }
      : { ...line, name: service.name, amount: special, note: "special-rate" };
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
