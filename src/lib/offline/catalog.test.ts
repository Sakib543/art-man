import { describe, expect, it } from "vitest";
import { isCatalogCopy, pricingFingerprint, type OfflineCatalog } from "./catalog";

const catalog: OfflineCatalog = {
  businessDate: "2026-09-26",
  services: [
    { id: "s-haircut", name: "Haircut", category: "Hair", price: 300, maxPrice: 500, minutes: 30 },
    { id: "s-shave", name: "Shave", category: "Beard", price: 200, maxPrice: null, minutes: 15 },
  ],
  deals: [{ id: "d-groom", name: "Groom", price: 450, serviceIds: ["s-haircut", "s-shave"] }],
  staff: [{ id: "st-arshad", name: "Arshad" }],
  customersWithRates: [
    { id: "c-ashfaq", phone: "03001234567", name: "Ashfaq Bhai", specialRates: { "s-haircut": 250, "s-shave": 150 } },
    { id: "c-kamran", phone: "03217654321", name: "Kamran", specialRates: { "s-shave": 180 } },
  ],
};

const fingerprint = (change: (copy: OfflineCatalog) => void) => {
  const copy = structuredClone(catalog);
  change(copy);
  return pricingFingerprint(copy);
};

describe("pricingFingerprint", () => {
  const base = pricingFingerprint(catalog);

  it("does not depend on the order rows were read in", () => {
    expect(
      fingerprint((copy) => {
        copy.services.reverse();
        copy.customersWithRates.reverse();
        copy.customersWithRates[1].specialRates = { "s-shave": 150, "s-haircut": 250 };
      }),
    ).toBe(base);
  });

  it.each([
    ["a price", (copy: OfflineCatalog) => void (copy.services[0].price = 350)],
    ["the top of a range", (copy: OfflineCatalog) => void (copy.services[0].maxPrice = 600)],
    ["a service's name, which is what the bill line is called", (copy: OfflineCatalog) => void (copy.services[1].name = "Beard shave")],
    ["a service switched off", (copy: OfflineCatalog) => void copy.services.pop()],
    ["a deal's price", (copy: OfflineCatalog) => void (copy.deals[0].price = 500)],
    ["the order of a deal's services, which decides the leftover rupee", (copy: OfflineCatalog) => void copy.deals[0].serviceIds.reverse()],
    ["a special rate", (copy: OfflineCatalog) => void (copy.customersWithRates[1].specialRates["s-shave"] = 170)],
    ["a special rate removed", (copy: OfflineCatalog) => void (copy.customersWithRates[1].specialRates = {})],
  ])("changes with %s", (_what, change) => {
    expect(fingerprint(change)).not.toBe(base);
  });

  it.each([
    ["the staff list", (copy: OfflineCatalog) => void copy.staff.push({ id: "st-sherry", name: "Sherry" })],
    ["a customer's name", (copy: OfflineCatalog) => void (copy.customersWithRates[0].name = "Ashfaq")],
    ["a customer's phone number", (copy: OfflineCatalog) => void (copy.customersWithRates[0].phone = "03000000000")],
    ["a service's category and minutes", (copy: OfflineCatalog) => void Object.assign(copy.services[0], { category: "X", minutes: 45 })],
    ["the business date", (copy: OfflineCatalog) => void (copy.businessDate = "2026-09-27")],
  ])("does not change with %s, which no bill's price depends on", (_what, change) => {
    expect(fingerprint(change)).toBe(base);
  });
});

describe("isCatalogCopy", () => {
  const copy = { catalog, version: "abc", servedAt: "2026-09-26T08:00:00.000Z" };

  it("accepts a copy", () => {
    expect(isCatalogCopy(copy)).toBe(true);
    expect(isCatalogCopy({ ...copy, catalog: { ...catalog, businessDate: null } })).toBe(true);
  });

  it.each([
    ["nothing", undefined],
    ["an HTML page read as text", "<!doctype html>"],
    ["an error body", { error: "Not signed in" }],
    ["a copy without its version", { ...copy, version: undefined }],
    ["a copy of an older shape", { ...copy, catalog: { ...catalog, customersWithRates: undefined } }],
  ])("refuses %s", (_what, value) => {
    expect(isCatalogCopy(value)).toBe(false);
  });
});
