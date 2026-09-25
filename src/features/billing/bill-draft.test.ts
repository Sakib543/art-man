import { describe, expect, it } from "vitest";
import { priceCart } from "@/lib/accounting";
import { draftLinesOf, payModeOf, type SavedBillLine } from "./bill-draft";

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
