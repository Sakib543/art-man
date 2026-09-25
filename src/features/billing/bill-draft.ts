import { allocate, otherDescriptionOf, priceCart, type PayMode, type PricingCatalog } from "@/lib/accounting";
import type { CartLine } from "./cart-state";

/**
 * Rebuilding the cart from a bill that was already saved, so the Owner can
 * correct it (P1.4). Pure — no React, no database — so it is easy to test.
 */

export interface SavedBillLine {
  /**
   * Null on an "Other" line (P3.12) and on the worksheet's old quick-add lines.
   * A reversal's lines have none either, but a reversal is refused before it
   * gets here (`getBillForEdit`).
   */
  serviceId: string | null;
  /** The name it was saved under — all an Other line has to say what it was. */
  name: string;
  dealId: string | null;
  staffId: string;
  /** What this line was charged. It is what a price range re-opens on (P3.11). */
  amount: number;
}

/**
 * `bill_lines` records which deal a line came from but not which *instance* of
 * it, and one bill may hold the same deal twice. A deal instance always
 * contributes exactly one line per service in the deal — `priceCart` refuses
 * anything else — so the n-th line of a given service belongs to the n-th
 * instance of that deal.
 */
export function draftLinesOf(saved: SavedBillLine[]): CartLine[] {
  const used = new Map<string, number>();

  return saved.flatMap<CartLine>((line, index) => {
    if (!line.serviceId) {
      // An Other line comes back as one, with its amount and what it was for.
      // Before P3.12 these were dropped, so correcting a bill that held a
      // quick-add line lost the line — and its money — without a word.
      return [
        {
          key: `line-${index}`,
          serviceId: null,
          staffId: line.staffId,
          dealId: null,
          dealInstanceId: null,
          amount: line.amount,
          description: otherDescriptionOf(line.name),
        },
      ];
    }

    if (!line.dealId) {
      // The amount comes back as it was charged, so re-opening a bill whose
      // service has a price range does not quietly reprice it (P3.11). For a
      // fixed price `priceCart` ignores it.
      return [
        {
          key: `line-${index}`,
          serviceId: line.serviceId,
          staffId: line.staffId,
          dealId: null,
          dealInstanceId: null,
          amount: line.amount,
          description: "",
        },
      ];
    }

    const slot = `${line.dealId}:${line.serviceId}`;
    const nth = used.get(slot) ?? 0;
    used.set(slot, nth + 1);

    const dealInstanceId = `${line.dealId}#${nth}`;
    return [
      {
        key: `${dealInstanceId}:${line.serviceId}`,
        serviceId: line.serviceId,
        staffId: line.staffId,
        dealId: line.dealId,
        dealInstanceId,
        // A deal's price is split by the deal, never chosen line by line.
        amount: null,
        description: "",
      },
    ];
  });
}

/**
 * Does the line carry its own price — an Other line, or a service with a price
 * range and no special rate — rather than take one from the catalog?
 */
function carriesItsPrice(line: CartLine, catalog: PricingCatalog): boolean {
  if (line.serviceId === null) return true;
  if (line.dealId) return false;
  const service = catalog.services[line.serviceId];
  return !!service && service.maxPrice !== null && catalog.specialRates[line.serviceId] === undefined;
}

/**
 * Put the discount back on the lines that carry their own price, before the
 * edit screen takes it off again (backlog P3.13).
 *
 * `bill_lines.amount` is stored **net** of the discount (P3.10). A fixed price
 * or a deal share is re-priced from the catalog on re-opening, so it comes back
 * whole; but a price-range line (P3.11) or an Other line (P3.12) comes back as
 * the net figure — and the screen used to take the discount off that a second
 * time. Haircut 300–500 charged 450 with Rs 50 off was saved at 400 and
 * re-opened at 350.
 *
 * Nothing stored says how the discount was split, so it is worked back out:
 *
 * - the lines before the discount came to the saved lines plus the discount;
 * - the fixed lines' share of that is what the catalog prices them at;
 * - what is left belongs to the self-priced lines, first guessed in proportion
 *   to what they were saved at;
 * - and the guess is **checked** by pricing the cart with the discount and
 *   comparing every line with what was saved. The largest-remainder split can
 *   leave a guess a rupee out between two lines, so a few one-rupee moves are
 *   tried before settling.
 *
 * Even an unchecked guess adds up to the right total, so the bill never comes
 * back cheaper than it was; only which line holds a stray rupee could differ.
 *
 * @param stored what each line was saved at, in the same order as `lines`
 */
export function restoreGross(
  lines: CartLine[],
  stored: number[],
  discount: number,
  catalog: PricingCatalog,
): CartLine[] {
  if (discount <= 0) return lines;

  const own = lines.flatMap((line, index) => (carriesItsPrice(line, catalog) ? [index] : []));
  if (own.length === 0) return lines;

  // What the fixed lines come to, whole. The self-priced ones stand at a
  // figure the catalog accepts meanwhile; their amounts are not read here.
  const placeholder = lines.map((line, index) =>
    own.includes(index)
      ? { ...line, amount: line.serviceId === null ? 0 : catalog.services[line.serviceId].price }
      : line,
  );
  let fixedGross: number;
  try {
    fixedGross = priceCart(placeholder, catalog).lines.reduce(
      (sum, line, index) => (own.includes(index) ? sum : sum + line.amount),
      0,
    );
  } catch {
    return lines;
  }

  const ownGross = stored.reduce((sum, amount) => sum + amount, 0) + discount - fixedGross;
  const ownNet = own.map((index) => stored[index]);
  // The catalog would have to have moved under the bill for this to happen.
  if (ownGross < ownNet.reduce((sum, amount) => sum + amount, 0)) return lines;

  const withGross = (gross: number[]) =>
    lines.map((line, index) => {
      const at = own.indexOf(index);
      return at === -1 ? line : { ...line, amount: gross[at] };
    });
  const reproduces = (gross: number[]) => {
    try {
      const repriced = priceCart(withGross(gross), catalog, discount).lines;
      return repriced.every((line, index) => line.amount === stored[index]);
    } catch {
      return false;
    }
  };

  const guess = allocate(ownGross, ownNet.some((amount) => amount > 0) ? ownNet : ownNet.map(() => 1));
  if (reproduces(guess)) return withGross(guess);

  for (let step = 1; step <= 3; step++) {
    for (let from = 0; from < own.length; from++) {
      for (let to = 0; to < own.length; to++) {
        if (from === to || guess[from] < step) continue;
        const moved = [...guess];
        moved[from] -= step;
        moved[to] += step;
        if (reproduces(moved)) return withGross(moved);
      }
    }
  }
  return withGross(guess);
}

/** Which payment mode a saved bill was taken on, so the edit screen opens on it. */
export function payModeOf(cash: number, online: number): PayMode {
  if (cash > 0 && online > 0) return "split";
  return online > 0 ? "online" : "cash";
}
