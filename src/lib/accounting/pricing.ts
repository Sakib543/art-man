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

export function priceCart(
  lines: CartLineInput[],
  catalog: PricingCatalog,
): { lines: PricedLine[]; total: Rupees } {
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

  return { lines: priced, total: priced.reduce((sum, line) => sum + line.amount, 0) };
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
