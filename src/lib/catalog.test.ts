import { describe, expect, it } from "vitest";
import { offeredDeals } from "./catalog";

const deals = [
  { id: "d1", name: "Groom", price: 2000 },
  { id: "d2", name: "Fresh", price: 900 },
];
const items = [
  { dealId: "d1", serviceId: "haircut" },
  { dealId: "d2", serviceId: "wash" },
  { dealId: "d1", serviceId: "shave" },
];

describe("offeredDeals", () => {
  it("attaches each deal's services, in the order they were read", () => {
    const [groom] = offeredDeals(deals, items, new Set(["haircut", "shave", "wash"]));
    expect(groom).toEqual({ id: "d1", name: "Groom", price: 2000, serviceIds: ["haircut", "shave"] });
  });

  it("drops a deal as soon as one of its services is switched off", () => {
    const offered = offeredDeals(deals, items, new Set(["haircut", "wash"]));
    expect(offered.map((deal) => deal.id)).toEqual(["d2"]);
  });

  it("keeps the deals' own order", () => {
    const offered = offeredDeals(deals, items, new Set(["haircut", "shave", "wash"]));
    expect(offered.map((deal) => deal.id)).toEqual(["d1", "d2"]);
  });
});
