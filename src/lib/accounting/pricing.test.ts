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
