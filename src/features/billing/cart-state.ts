/**
 * The cart, as a pure reducer (no React, no database) so it is easy to test.
 * Lines added from one deal share a `dealInstanceId` and are added and removed
 * together, because the deal price is split across all of its services.
 */

export interface CartLine {
  key: string;
  serviceId: string;
  staffId: string | null;
  dealId: string | null;
  dealInstanceId: string | null;
}

export type CartAction =
  | { type: "addService"; key: string; serviceId: string }
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
        { key: action.key, serviceId: action.serviceId, staffId: null, dealId: null, dealInstanceId: null },
      ];

    case "addDeal":
      return [
        ...lines,
        ...action.serviceIds.map((serviceId) => ({
          key: `${action.instanceId}:${serviceId}`,
          serviceId,
          staffId: null,
          dealId: action.dealId,
          dealInstanceId: action.instanceId,
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
