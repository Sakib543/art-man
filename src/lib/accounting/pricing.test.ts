import { describe, expect, it } from "vitest";
import {
  checkPayment,
  OTHER_MAX,
  otherDescriptionOf,
  otherLineName,
  paymentAmounts,
  priceCart,
  PricingError,
  type CartLineInput,
  type PricingCatalog,
} from "./index";

const catalog: PricingCatalog = {
  services: {
    hc: { id: "hc", name: "Haircut", price: 800, maxPrice: null },
    bd: { id: "bd", name: "Beard trim", price: 400, maxPrice: null },
    fc: { id: "fc", name: "Facial", price: 1800, maxPrice: null },
  },
  deals: { vip: { id: "vip", name: "VIP deal", price: 2000, serviceIds: ["hc", "bd", "fc"] } },
  specialRates: {},
};

const single = (serviceId: string): CartLineInput => ({
  serviceId,
  staffId: "s1",
  dealId: null,
  dealInstanceId: null,
});

const dealLines = (instanceId: string): CartLineInput[] =>
  ["hc", "bd", "fc"].map((serviceId) => ({
    serviceId,
    staffId: "s1",
    dealId: "vip",
    dealInstanceId: instanceId,
  }));

describe("priceCart", () => {
  it("charges list price for a walk-in", () => {
    const { lines, total } = priceCart([single("hc"), single("bd")], catalog);
    expect(lines.map((l) => l.amount)).toEqual([800, 400]);
    expect(total).toBe(1200);
  });

  it("applies a customer's special rate and marks the line", () => {
    const { lines, total } = priceCart([single("hc")], { ...catalog, specialRates: { hc: 1500 } });
    expect(lines[0]).toMatchObject({ amount: 1500, note: "special-rate" });
    expect(total).toBe(1500);
  });

  it("splits a deal by list price: 533 / 267 / 1200 = 2000", () => {
    const { lines, total } = priceCart(dealLines("d1"), catalog);
    expect(lines.map((l) => l.amount)).toEqual([533, 267, 1200]);
    expect(lines.every((l) => l.note === "deal-share")).toBe(true);
    expect(total).toBe(2000);
  });

  it("prices two copies of the same deal separately", () => {
    const { total } = priceCart([...dealLines("d1"), ...dealLines("d2")], catalog);
    expect(total).toBe(4000);
  });

  it("special rates do not change a deal's price", () => {
    const { total } = priceCart(dealLines("d1"), { ...catalog, specialRates: { hc: 100 } });
    expect(total).toBe(2000);
  });

  it("rejects a deal with a missing service", () => {
    expect(() => priceCart(dealLines("d1").slice(0, 2), catalog)).toThrow(PricingError);
  });

  it("rejects an unknown service", () => {
    expect(() => priceCart([single("nope")], catalog)).toThrow(PricingError);
  });
});

describe("payment", () => {
  it("cash and online modes pay the whole total one way", () => {
    expect(paymentAmounts("cash", 1200, { cash: 0, online: 0 })).toEqual({ cash: 1200, online: 0 });
    expect(paymentAmounts("online", 1200, { cash: 0, online: 0 })).toEqual({ cash: 0, online: 1200 });
  });

  it("split uses the typed amounts", () => {
    expect(paymentAmounts("split", 1200, { cash: 700, online: 500 })).toEqual({ cash: 700, online: 500 });
  });

  it("accepts an exact payment", () => {
    expect(checkPayment(1200, 700, 500)).toEqual({ ok: true, remaining: 0 });
  });

  it("reports what is still to collect, or the overpayment", () => {
    expect(checkPayment(1200, 700, 0)).toEqual({ ok: false, remaining: 500 });
    expect(checkPayment(1200, 800, 500)).toEqual({ ok: false, remaining: -100 });
  });

  it("refuses an empty bill", () => {
    expect(checkPayment(0, 0, 0).ok).toBe(false);
  });
});

describe("priceCart with a discount (P3.10)", () => {
  it("leaves the lines alone when there is no discount", () => {
    const priced = priceCart([single("hc"), single("bd")], catalog, 0);
    expect(priced).toMatchObject({ subtotal: 1200, discount: 0, total: 1200 });
    expect(priced.lines.map((l) => l.amount)).toEqual([800, 400]);
  });

  it("takes the discount off the total", () => {
    const priced = priceCart([single("hc"), single("bd")], catalog, 300);
    expect(priced.subtotal).toBe(1200);
    expect(priced.discount).toBe(300);
    expect(priced.total).toBe(900);
  });

  it("shares the discount across the lines, in proportion", () => {
    // 1200 off by 300 is a quarter: 800 -> 600, 400 -> 300.
    const { lines } = priceCart([single("hc"), single("bd")], catalog, 300);
    expect(lines.map((l) => l.amount)).toEqual([600, 300]);
  });

  it("the lines always add up to the total, whatever the rounding", () => {
    // 1200 off by 7 does not divide evenly; the leftover rupee has to land
    // somewhere, and it must not be invented or lost.
    const { lines, total } = priceCart([single("hc"), single("bd")], catalog, 7);
    expect(lines.reduce((sum, l) => sum + l.amount, 0)).toBe(total);
    expect(total).toBe(1193);
  });

  it("commission follows the discounted line, because the line is what is stored", () => {
    // The whole design in one assertion: nothing downstream reads the discount.
    const { lines } = priceCart([single("fc")], catalog, 800);
    expect(lines[0].amount).toBe(1000);
  });

  it("never takes a line below zero", () => {
    // A lopsided cart is where a careless split would go negative: 2200 off by
    // 2199 leaves 1 rupee to spread over a 1,800 line and a 400 line.
    const { lines, total } = priceCart([single("fc"), single("bd")], catalog, 2199);
    expect(lines.every((l) => l.amount >= 0)).toBe(true);
    expect(lines.reduce((sum, l) => sum + l.amount, 0)).toBe(total);
    expect(total).toBe(1);
  });

  it("discounts a deal too, on top of the deal price", () => {
    const priced = priceCart(dealLines("d1"), catalog, 200);
    expect(priced.subtotal).toBe(2000);
    expect(priced.total).toBe(1800);
    expect(priced.lines.reduce((sum, l) => sum + l.amount, 0)).toBe(1800);
    expect(priced.lines.every((l) => l.note === "deal-share")).toBe(true);
  });

  it("refuses to give the bill away", () => {
    expect(() => priceCart([single("hc")], catalog, 800)).toThrow(PricingError);
    expect(() => priceCart([single("hc")], catalog, 900)).toThrow(/less than the bill total of Rs 800/);
  });

  it("refuses a negative or fractional discount", () => {
    expect(() => priceCart([single("hc")], catalog, -50)).toThrow(/never negative/);
    expect(() => priceCart([single("hc")], catalog, 10.5)).toThrow(/whole rupees/);
  });

  it("a discounted total is what the payment has to match", () => {
    const { total } = priceCart([single("hc"), single("bd")], catalog, 200);
    expect(checkPayment(total, 1000, 0).ok).toBe(true);
    expect(checkPayment(total, 1200, 0).ok).toBe(false);
  });
});

/** A service priced "300 - 500" on the salon's printed list (P3.11). */
describe("priceCart with a price range", () => {
  const ranged: PricingCatalog = {
    services: {
      fade: { id: "fade", name: "Hair cut (fades)", price: 300, maxPrice: 500 },
      shave: { id: "shave", name: "Shave / trim", price: 150, maxPrice: null },
    },
    deals: { combo: { id: "combo", name: "Combo", price: 400, serviceIds: ["fade", "shave"] } },
    specialRates: {},
  };
  const pick = (serviceId: string, amount: number | null): CartLineInput => ({
    serviceId,
    staffId: "s1",
    dealId: null,
    dealInstanceId: null,
    amount,
  });

  it("charges what the counter chose inside the range", () => {
    const { lines, total } = priceCart([pick("fade", 450)], ranged);
    expect(lines[0].amount).toBe(450);
    expect(lines[0].note).toBe("chosen");
    expect(total).toBe(450);
  });

  it("charges the bottom of the range when nothing was chosen yet", () => {
    expect(priceCart([pick("fade", null)], ranged).total).toBe(300);
  });

  it("allows both ends of the range", () => {
    expect(priceCart([pick("fade", 300)], ranged).total).toBe(300);
    expect(priceCart([pick("fade", 500)], ranged).total).toBe(500);
  });

  it("refuses anything outside it, and says the range", () => {
    expect(() => priceCart([pick("fade", 250)], ranged)).toThrow(/between Rs 300 and Rs 500/);
    expect(() => priceCart([pick("fade", 501)], ranged)).toThrow(PricingError);
    expect(() => priceCart([pick("fade", 400.5)], ranged)).toThrow(PricingError);
  });

  it("ignores an amount sent for a service that has one fixed price", () => {
    // The browser may send anything; a fixed price is the catalog's to decide.
    expect(priceCart([pick("shave", 5000)], ranged).total).toBe(150);
  });

  it("a special rate beats the range", () => {
    const withRate = { ...ranged, specialRates: { fade: 200 } };
    const { lines } = priceCart([pick("fade", 500)], withRate);
    expect(lines[0]).toMatchObject({ amount: 200, note: "special-rate" });
  });

  it("a deal ignores the choice, because the deal's own price is what is paid", () => {
    const dealLines: CartLineInput[] = ["fade", "shave"].map((serviceId) => ({
      serviceId,
      staffId: "s1",
      dealId: "combo",
      dealInstanceId: "d1",
      amount: 500,
    }));
    const { lines, total } = priceCart(dealLines, ranged);
    expect(total).toBe(400);
    expect(lines.every((l) => l.note === "deal-share")).toBe(true);
  });

  it("works with a discount on top", () => {
    const { subtotal, total } = priceCart([pick("fade", 500)], ranged, 100);
    expect(subtotal).toBe(500);
    expect(total).toBe(400);
  });
});

describe("an Other line (P3.12)", () => {
  const other = (amount: number | null, description: string | null = null): CartLineInput => ({
    serviceId: null,
    staffId: "s2",
    dealId: null,
    dealInstanceId: null,
    amount,
    description,
  });

  it("charges what the counter typed, beside services from the list", () => {
    const cart = priceCart([single("hc"), other(250, "Beard shape")], catalog);
    expect(cart.lines.map((line) => [line.name, line.amount])).toEqual([
      ["Haircut", 800],
      ["Other: Beard shape", 250],
    ]);
    expect(cart.total).toBe(1050);
  });

  it("is plain Other when nothing was said about it", () => {
    expect(priceCart([other(300)], catalog).lines[0].name).toBe("Other");
    expect(priceCart([other(300, "   ")], catalog).lines[0].name).toBe("Other");
  });

  it("keeps its staff member, so commission follows it like any line", () => {
    expect(priceCart([other(300)], catalog).lines[0].staffId).toBe("s2");
  });

  it("reads a blank amount as 0 while it is being typed", () => {
    const cart = priceCart([single("hc"), other(null)], catalog);
    expect(cart.lines[1].amount).toBe(0);
    expect(cart.total).toBe(800);
  });

  it("takes its share of a discount, like any line", () => {
    const cart = priceCart([single("hc"), other(200)], catalog, 100);
    expect(cart.lines.map((line) => line.amount)).toEqual([720, 180]);
    expect(cart.total).toBe(900);
  });

  it("ignores a customer's special rates", () => {
    const withRates = { ...catalog, specialRates: { hc: 500 } };
    expect(priceCart([other(300)], withRates).lines[0].amount).toBe(300);
  });

  it("refuses a negative, fractional or runaway amount", () => {
    expect(() => priceCart([other(-50)], catalog)).toThrow(PricingError);
    expect(() => priceCart([other(12.5)], catalog)).toThrow(PricingError);
    expect(() => priceCart([other(OTHER_MAX + 1)], catalog)).toThrow(/at most/);
    expect(priceCart([other(OTHER_MAX)], catalog).total).toBe(OTHER_MAX);
  });

  it("cannot be part of a deal", () => {
    expect(() => priceCart([{ ...other(300), dealId: "vip", dealInstanceId: "d1" }], catalog)).toThrow(PricingError);
  });
});

describe("Other line names", () => {
  it("round-trips a description through the saved name", () => {
    expect(otherDescriptionOf(otherLineName("Beard shape"))).toBe("Beard shape");
    expect(otherDescriptionOf(otherLineName(null))).toBe("");
  });

  it("keeps an older free-amount line's name as its description", () => {
    // The worksheet's quick-add saved "Quick add" with no service (removed in P6.4).
    expect(otherDescriptionOf("Quick add")).toBe("Quick add");
  });
});

describe("a kept deal split (P3.14)", () => {
  // Split by list price, VIP 2000 over 800 / 400 / 1800 is 533 / 267 / 1200.
  const kept = { hc: 1000, bd: 500, fc: 500 };

  it("uses the split a re-opened bill was saved with", () => {
    const cart = priceCart(dealLines("d1"), { ...catalog, dealSplits: { d1: kept } });
    expect(cart.lines.map((line) => line.amount)).toEqual([1000, 500, 500]);
    expect(cart.total).toBe(2000);
  });

  it("applies only to its own deal instance", () => {
    const cart = priceCart([...dealLines("d1"), ...dealLines("d2")], { ...catalog, dealSplits: { d1: kept } });
    expect(cart.lines.map((line) => line.amount)).toEqual([1000, 500, 500, 533, 267, 1200]);
  });

  it("falls back to list price when the split no longer adds up to the deal", () => {
    const bad: Record<string, number>[] = [
      { hc: 1000, bd: 500, fc: 499 },
      { hc: 1000, bd: 1000 },
      { hc: 2001, bd: -1, fc: 0 },
      { hc: 1000.5, bd: 499.5, fc: 500 },
    ];
    for (const split of bad) {
      const cart = priceCart(dealLines("d1"), { ...catalog, dealSplits: { d1: split } });
      expect(cart.lines.map((line) => line.amount)).toEqual([533, 267, 1200]);
    }
  });

  it("still takes a discount on top", () => {
    const cart = priceCart(dealLines("d1"), { ...catalog, dealSplits: { d1: kept } }, 200);
    expect(cart.lines.map((line) => line.amount)).toEqual([900, 450, 450]);
  });
});
