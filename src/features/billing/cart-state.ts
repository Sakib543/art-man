/**
 * The cart, as a pure reducer (no React, no database) so it is easy to test.
 * Lines added from one deal share a `dealInstanceId` and are added and removed
 * together, because the deal price is split across all of its services.
 */

export interface CartLine {
  key: string;
  /** Null on an "Other" line (P3.12): extra work the list has no service for. */
  serviceId: string | null;
  staffId: string | null;
  dealId: string | null;
  dealInstanceId: string | null;
  /**
   * What the counter chose for a service with a price range (P3.11). Null
   * until they type something, which `priceCart` reads as the bottom of the
   * range — the figure the screen is already showing.
   *
   * On an "Other" line it is the price itself, and blank until typed.
   */
  amount: number | null;
  /** What an "Other" line was for. Optional; empty on every other line. */
  description: string;
}

export type CartAction =
  | { type: "addService"; key: string; serviceId: string }
  | { type: "addOther"; key: string }
  | { type: "setDescription"; key: string; description: string }
  | { type: "setAmount"; key: string; amount: number | null }
  | { type: "addDeal"; instanceId: string; dealId: string; serviceIds: string[] }
  | { type: "remove"; key: string }
  | { type: "setStaff"; key: string; staffId: string | null }
  | { type: "setAllStaff"; staffId: string | null }
  | { type: "clear" };

export function cartReducer(lines: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case "addService":
      return [
        ...lines,
        {
          key: action.key,
          serviceId: action.serviceId,
          staffId: null,
          dealId: null,
          dealInstanceId: null,
          amount: null,
          description: "",
        },
      ];

    case "addOther": {
      // Starts with the staff member every other line already shares, so the
      // usual case — one karigar, one extra job — needs no second choice.
      return [
        ...lines,
        {
          key: action.key,
          serviceId: null,
          staffId: commonStaff(lines),
          dealId: null,
          dealInstanceId: null,
          amount: null,
          description: "",
        },
      ];
    }

    case "setDescription":
      return lines.map((line) => (line.key === action.key ? { ...line, description: action.description } : line));

    case "addDeal":
      return [
        ...lines,
        ...action.serviceIds.map((serviceId) => ({
          key: `${action.instanceId}:${serviceId}`,
          serviceId,
          staffId: null,
          dealId: action.dealId,
          dealInstanceId: action.instanceId,
          // A deal's price is the deal's own; there is nothing to choose.
          amount: null,
          description: "",
        })),
      ];

    case "remove": {
      const target = lines.find((line) => line.key === action.key);
      if (!target) return lines;
      // Removing one service of a deal removes the whole deal.
      return target.dealInstanceId
        ? lines.filter((line) => line.dealInstanceId !== target.dealInstanceId)
        : lines.filter((line) => line.key !== action.key);
    }

    case "setAmount":
      return lines.map((line) => (line.key === action.key ? { ...line, amount: action.amount } : line));

    case "setStaff":
      return lines.map((line) => (line.key === action.key ? { ...line, staffId: action.staffId } : line));

    case "setAllStaff":
      return lines.map((line) => ({ ...line, staffId: action.staffId }));

    case "clear":
      return [];
  }
}

/** The staff id shared by every line, or null if lines differ or any is unset. */
export function commonStaff(lines: CartLine[]): string | null {
  if (lines.length === 0) return null;
  const first = lines[0].staffId;
  return first && lines.every((line) => line.staffId === first) ? first : null;
}
