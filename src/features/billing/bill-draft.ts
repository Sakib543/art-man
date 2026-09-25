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

/** A re-opened bill: its cart, and how each of its deals was split when it was sold. */
export interface RestoredDraft {
  lines: CartLine[];
  /** By deal instance id, then service id — `PricingCatalog.dealSplits`. */
  dealSplits: Record<string, Record<string, number>>;
}

/**
 * Turn a saved bill back into what the counter had in front of it, before the
 * edit screen prices it again (backlog P3.13, P3.14).
 *
 * `bill_lines.amount` is what each line was charged: **net** of the bill's
 * discount (P3.10), and for a deal, the deal's price **split by the list
 * prices of that moment**. Two things go wrong if those figures are used as
 * they are:
 *
 * - a line that carries its own price — a price range (P3.11), an Other line
 *   (P3.12) — comes back net, and the screen takes the discount off a second
 *   time. Haircut 300–500 charged 450 with Rs 50 off was saved at 400 and
 *   re-opened at 350 (P3.13);
 * - a deal is split again by *today's* list prices, so if one moved since the
 *   sale, a correction quietly moves commission between karigars (P3.14).
 *
 * Nothing stored says how the discount was shared, so both are worked out:
 * the unknowns are each self-priced line's amount and each deal line's share,
 * in groups whose totals are known — a deal's shares come to the deal's price,
 * the self-priced lines to whatever the discount and the fixed lines leave.
 * A first guess splits each group in proportion to what was saved; it is then
 * **checked** by pricing the cart with the discount and comparing every line
 * with what was saved, and nudged a rupee at a time between lines of one group
 * until they all match. Every guess keeps each group's total, so even one that
 * never matches puts the bill back at the right total.
 *
 * With no discount there is nothing to work out: the saved figures are the
 * split and the amounts.
 *
 * @param stored what each line was saved at, in the same order as `lines`
 */
export function restoreSaved(
  lines: CartLine[],
  stored: number[],
  discount: number,
  catalog: PricingCatalog,
): RestoredDraft {
  // Deal lines by instance, only for a deal the catalog still knows.
  const instances = new Map<string, number[]>();
  lines.forEach((line, index) => {
    if (!line.dealId || !line.dealInstanceId || !catalog.deals[line.dealId]) return;
    instances.set(line.dealInstanceId, [...(instances.get(line.dealInstanceId) ?? []), index]);
  });

  const splitOf = (members: number[], shares: number[]) =>
    Object.fromEntries(members.map((index, at) => [lines[index].serviceId, shares[at]]));

  if (discount <= 0) {
    const dealSplits: RestoredDraft["dealSplits"] = {};
    for (const [instance, members] of instances) {
      dealSplits[instance] = splitOf(members, members.map((index) => stored[index]));
    }
    // A split that no longer adds up to the deal's price is dropped by
    // `priceCart`, which then splits by list price as before.
    return { lines, dealSplits };
  }

  // The groups of unknowns, each with the total it must keep.
  const own = lines.flatMap((line, index) => (carriesItsPrice(line, catalog) ? [index] : []));
  const groups: { members: number[]; total: number; deal: string | null }[] = [];
  for (const [instance, members] of instances) {
    groups.push({ members, total: catalog.deals[lines[members[0]].dealId!].price, deal: instance });
  }

  if (own.length > 0) {
    // What the fixed lines come to, whole. Self-priced lines stand at a figure
    // the catalog accepts meanwhile; deal lines are left out of the sum.
    const placeholder = lines.map((line, index) =>
      own.includes(index)
        ? { ...line, amount: line.serviceId === null ? 0 : catalog.services[line.serviceId].price }
        : line,
    );
    try {
      const fixed = priceCart(placeholder, catalog).lines.reduce(
        (sum, line, index) => (own.includes(index) || line.dealId ? sum : sum + line.amount),
        0,
      );
      const dealsTotal = groups.reduce((sum, group) => sum + group.total, 0);
      const ownTotal = stored.reduce((sum, amount) => sum + amount, 0) + discount - fixed - dealsTotal;
      // Below what was saved, the catalog must have moved under the bill;
      // those lines keep their saved figures rather than a guess.
      if (ownTotal >= own.reduce((sum, index) => sum + stored[index], 0)) {
        groups.push({ members: own, total: ownTotal, deal: null });
      }
    } catch {
      // A service the bill used is gone; nothing sensible to restore for these.
    }
  }

  if (groups.length === 0) return { lines, dealSplits: {} };

  const build = (values: number[][]): RestoredDraft => {
    const next = [...lines];
    const dealSplits: RestoredDraft["dealSplits"] = {};
    groups.forEach((group, at) => {
      if (group.deal) dealSplits[group.deal] = splitOf(group.members, values[at]);
      else group.members.forEach((index, k) => (next[index] = { ...next[index], amount: values[at][k] }));
    });
    return { lines: next, dealSplits };
  };
  const distance = (values: number[][]) => {
    const draft = build(values);
    try {
      const repriced = priceCart(draft.lines, { ...catalog, dealSplits: draft.dealSplits }, discount).lines;
      return repriced.reduce((sum, line, index) => sum + Math.abs(line.amount - stored[index]), 0);
    } catch {
      return Infinity;
    }
  };

  let values = groups.map((group) => {
    const saved = group.members.map((index) => stored[index]);
    return allocate(group.total, saved.some((amount) => amount > 0) ? saved : saved.map(() => 1));
  });
  let best = distance(values);

  // Nudge a rupee (up to three) between two lines of one group while that
  // brings the cart closer to what was saved. Bounded, and cheap: a bill has
  // a handful of lines.
  for (let round = 0; round < 60 && best > 0; round++) {
    let improved: number[][] | null = null;
    let improvedBy = best;
    groups.forEach((group, at) => {
      for (let step = 1; step <= 3; step++) {
        for (let from = 0; from < group.members.length; from++) {
          for (let to = 0; to < group.members.length; to++) {
            if (from === to || values[at][from] < step) continue;
            const moved = values.map((row) => [...row]);
            moved[at][from] -= step;
            moved[at][to] += step;
            const d = distance(moved);
            if (d < improvedBy) {
              improvedBy = d;
              improved = moved;
            }
          }
        }
      }
    });
    if (!improved) break;
    values = improved;
    best = improvedBy;
  }

  return build(values);
}

/** Which payment mode a saved bill was taken on, so the edit screen opens on it. */
export function payModeOf(cash: number, online: number): PayMode {
  if (cash > 0 && online > 0) return "split";
  return online > 0 ? "online" : "cash";
}
