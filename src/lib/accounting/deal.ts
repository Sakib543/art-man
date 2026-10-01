import { allocate } from "./allocate";
import type { Rupees } from "./types";

/**
 * Split a deal's fixed price across its services by list price.
 * The parts always add up to the deal price, so commission stays correct.
 *
 * Example: deal 2000 over 800 / 400 / 1800 -> 533 / 267 / 1200.
 *
 * A deal whose services all have a list price of 0 has nothing to weigh by,
 * so it is shared equally (P7.17, QA-13). It used to throw a plain `Error`
 * from `allocate`: an empty message at the counter and "Something went wrong"
 * from the server, with the customer waiting.
 */
export function splitDealPrice(dealPrice: Rupees, listPrices: Rupees[]): Rupees[] {
  const weights = listPrices.some((price) => price > 0) ? listPrices : listPrices.map(() => 1);
  return allocate(dealPrice, weights);
}
