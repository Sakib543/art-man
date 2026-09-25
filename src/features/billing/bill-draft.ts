import { otherDescriptionOf, type PayMode } from "@/lib/accounting";
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

/** Which payment mode a saved bill was taken on, so the edit screen opens on it. */
export function payModeOf(cash: number, online: number): PayMode {
  if (cash > 0 && online > 0) return "split";
  return online > 0 ? "online" : "cash";
}
