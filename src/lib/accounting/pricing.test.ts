import { describe, expect, it } from "vitest";
import {
  checkPayment,
  paymentAmounts,
  priceCart,
  PricingError,
  type CartLineInput,
  type PricingCatalog,
} from "./index";

const catalog: PricingCatalog = {
  services: {
    hc: { id: "hc", name: "Haircut", price: 800 },
    bd: { id: "bd", name: "Beard trim", price: 400 },
    fc: { id: "fc", name: "Facial", price: 1800 },
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
