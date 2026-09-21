import { allocate } from "./allocate";
import type { Rupees } from "./types";

/**
 * Split a deal's fixed price across its services by list price.
 * The parts always add up to the deal price, so commission stays correct.
 *
 * Example: deal 2000 over 800 / 400 / 1800 -> 533 / 267 / 1200.
 */
export function splitDealPrice(dealPrice: Rupees, listPrices: Rupees[]): Rupees[] {
  return allocate(dealPrice, listPrices);
}
