import type { PayMode } from "@/lib/accounting";
import type { CartLine } from "./cart-state";

/**
 * Rebuilding the cart from a bill that was already saved, so the Owner can
 * correct it (P1.4). Pure — no React, no database — so it is easy to test.
 */

export interface SavedBillLine {
  /** Null only on a reversal bill's lines, which are never editable. */
  serviceId: string | null;
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
    if (!line.serviceId) return [];

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
      },
    ];
  });
}

/** Which payment mode a saved bill was taken on, so the edit screen opens on it. */
export function payModeOf(cash: number, online: number): PayMode {
  if (cash > 0 && online > 0) return "split";
  return online > 0 ? "online" : "cash";
}
