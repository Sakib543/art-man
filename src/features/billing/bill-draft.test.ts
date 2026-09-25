import { describe, expect, it } from "vitest";
import { priceCart, type PricingCatalog } from "@/lib/accounting";
import { draftLinesOf, payModeOf, restoreGross, type SavedBillLine } from "./bill-draft";

const line = (
  serviceId: string | null,
  dealId: string | null,
  staffId = "sherry",
  amount = 0,
  name = serviceId ?? "Other",
): SavedBillLine => ({
  serviceId,
  name,
  dealId,
  staffId,
  amount,
});

describe("draftLinesOf", () => {
  it("rebuilds plain service lines with the staff member who did the work", () => {
    const lines = draftLinesOf([line("haircut", null, "sherry"), line("shave", null, "hamid")]);

    expect(lines.map((l) => [l.serviceId, l.staffId])).toEqual([
      ["haircut", "sherry"],
      ["shave", "hamid"],
    ]);
    expect(lines.every((l) => l.dealId === null && l.dealInstanceId === null)).toBe(true);
  });

  it("keeps the two services of one deal in the same instance", () => {
    const lines = draftLinesOf([line("haircut", "combo"), line("shave", "combo")]);

    expect(new Set(lines.map((l) => l.dealInstanceId)).size).toBe(1);
  });

  it("splits the same deal used twice into two instances", () => {
    // The whole reason this function exists: bill_lines does not record the instance.
    const lines = draftLinesOf([
      line("haircut", "combo"),
      line("shave", "combo"),
      line("haircut", "combo"),
      line("shave", "combo"),
    ]);

    expect(new Set(lines.map((l) => l.dealInstanceId)).size).toBe(2);
    for (const instance of new Set(lines.map((l) => l.dealInstanceId))) {
      expect(lines.filter((l) => l.dealInstanceId === instance).map((l) => l.serviceId).sort()).toEqual([
        "haircut",
        "shave",
      ]);
    }
  });

  it("prices a rebuilt double deal at twice the deal price, not once", () => {
    // Collapsing both instances into one would have charged the customer half.
    const lines = draftLinesOf([
      line("haircut", "combo"),
      line("shave", "combo"),
      line("haircut", "combo"),
      line("shave", "combo"),
    ]);

    const { total } = priceCart(lines, {
      services: {
        haircut: { id: "haircut", name: "Haircut", price: 800, maxPrice: null },
        shave: { id: "shave", name: "Shave", price: 400, maxPrice: null },
      },
      deals: { combo: { id: "combo", name: "Combo", price: 1000, serviceIds: ["haircut", "shave"] } },
      specialRates: {},
    });

    expect(total).toBe(2000);
  });

  it("gives every line its own key, so the cart can remove one of them", () => {
    const lines = draftLinesOf([
      line("haircut", null),
      line("haircut", null),
      line("haircut", "combo"),
      line("shave", "combo"),
    ]);

    expect(new Set(lines.map((l) => l.key)).size).toBe(lines.length);
  });

  it("brings an Other line back with its amount and what it was for (P3.12)", () => {
    const [other, haircut] = draftLinesOf([line(null, null, "hamid", 250, "Other: Beard shape"), line("haircut", null)]);
    expect(other).toMatchObject({ serviceId: null, staffId: "hamid", amount: 250, description: "Beard shape" });
    expect(haircut.serviceId).toBe("haircut");
  });

  it("keeps an old quick-add line instead of dropping it and its money", () => {
    // Before P3.12 a line with no service vanished from the cart, so a
    // correction silently lost it.
    const [quick] = draftLinesOf([line(null, null, "arshad", 400, "Quick add")]);
    expect(quick).toMatchObject({ serviceId: null, amount: 400, description: "Quick add" });
  });
});

describe("payModeOf", () => {
  it("opens on the mode the bill was actually taken on", () => {
    expect(payModeOf(800, 0)).toBe("cash");
    expect(payModeOf(0, 800)).toBe("online");
    expect(payModeOf(300, 500)).toBe("split");
  });

  it("treats a bill of nothing as cash, the everyday default", () => {
    expect(payModeOf(0, 0)).toBe("cash");
  });
});

describe("draftLinesOf and a price range (P3.11)", () => {
  it("re-opens a line on what it was charged, not on the bottom of the range", () => {
    const lines = draftLinesOf([line("fade", null, "sherry", 450)]);

    expect(lines[0].amount).toBe(450);
  });

  it("leaves a deal's lines with nothing chosen, because the deal decides the price", () => {
    const lines = draftLinesOf([line("haircut", "vip", "sherry", 900), line("shave", "vip", "sherry", 300)]);

    expect(lines.every((l) => l.amount === null)).toBe(true);
  });
});

describe("restoreGross (P3.13)", () => {
  const catalog: PricingCatalog = {
    services: {
      fade: { id: "fade", name: "Haircut", price: 300, maxPrice: 500 },
      beard: { id: "beard", name: "Beard trim", price: 400, maxPrice: null },
      color: { id: "color", name: "Hair color", price: 1000, maxPrice: 3000 },
    },
    deals: {},
    specialRates: {},
  };

  type Sold = { serviceId: string | null; amount: number | null };

  /** Ring a bill up as the counter would, then re-open it as the edit screen does. */
  function roundTrip(sold: Sold[], discount: number, prices = catalog) {
    const cart = sold.map((line) => ({
      serviceId: line.serviceId,
      staffId: "sherry",
      dealId: null,
      dealInstanceId: null,
      amount: line.amount,
    }));
    const saved = priceCart(cart, prices, discount);
    const stored = saved.lines.map((line) => line.amount);
    const draft = draftLinesOf(
      saved.lines.map((line) => ({ serviceId: line.serviceId, name: line.name, dealId: null, staffId: "sherry", amount: line.amount })),
    );
    const restored = restoreGross(draft, stored, discount, prices);
    const reopened = priceCart(restored, prices, discount);
    return { saved, stored, restored, reopened };
  }

  it("re-opens Haircut 300–500 charged 450 with Rs 50 off at 450, not 400 — the reported case", () => {
    const { saved, restored, reopened } = roundTrip([{ serviceId: "fade", amount: 450 }], 50);
    expect(saved.total).toBe(400);
    expect(restored[0].amount).toBe(450);
    expect(reopened.total).toBe(400);
  });

  it("re-opens a range charged at its bottom, which the old net figure fell below", () => {
    // Saved at 250 — under the range — so the bill could not even be re-opened.
    const { stored, restored, reopened } = roundTrip([{ serviceId: "fade", amount: 300 }], 50);
    expect(stored).toEqual([250]);
    expect(restored[0].amount).toBe(300);
    expect(reopened.total).toBe(250);
  });

  it("puts the discount back on an Other line too", () => {
    const { restored, reopened, saved } = roundTrip([{ serviceId: "beard", amount: null }, { serviceId: null, amount: 250 }], 65);
    expect(restored[1].amount).toBe(250);
    expect(reopened.total).toBe(saved.total);
  });

  it("gets every line back exactly, across many discounts and mixes", () => {
    const mixes: Sold[][] = [
      [{ serviceId: "fade", amount: 450 }, { serviceId: "beard", amount: null }],
      [{ serviceId: "fade", amount: 450 }, { serviceId: null, amount: 250 }],
      [{ serviceId: "fade", amount: 333 }, { serviceId: "color", amount: 1777 }, { serviceId: null, amount: 91 }],
      [{ serviceId: null, amount: 1 }, { serviceId: null, amount: 999 }, { serviceId: "beard", amount: null }],
    ];
    for (const sold of mixes) {
      for (let discount = 1; discount < 300; discount += 7) {
        const { stored, reopened } = roundTrip(sold, discount);
        expect(reopened.lines.map((line) => line.amount)).toEqual(stored);
      }
    }
  });

  it("leaves a bill with no discount alone", () => {
    const draft = draftLinesOf([line("fade", null, "sherry", 450)]);
    expect(restoreGross(draft, [450], 0, catalog)).toBe(draft);
  });

  it("leaves a bill of fixed prices alone — the catalog already re-prices them whole", () => {
    const draft = draftLinesOf([line("beard", null, "sherry", 350)]);
    expect(restoreGross(draft, [350], 50, catalog)).toBe(draft);
  });

  it("treats a special rate as fixed, even on a service with a range", () => {
    const withRate = { ...catalog, specialRates: { fade: 350 } };
    const draft = draftLinesOf([line("fade", null, "sherry", 300)]);
    expect(restoreGross(draft, [300], 50, withRate)).toBe(draft);
  });
});
