import { describe, expect, it } from "vitest";
import { cartReducer, commonStaff, type CartLine } from "./cart-state";

const add = (lines: CartLine[], key: string, serviceId: string) =>
  cartReducer(lines, { type: "addService", key, serviceId });

describe("cartReducer", () => {
  it("adds a service with no staff chosen", () => {
    const lines = add([], "a", "hc");
    expect(lines).toEqual([{ key: "a", serviceId: "hc", staffId: null, dealId: null, dealInstanceId: null }]);
  });

  it("adds every service of a deal as one group", () => {
    const lines = cartReducer([], { type: "addDeal", instanceId: "d1", dealId: "vip", serviceIds: ["hc", "bd"] });
    expect(lines.map((l) => l.key)).toEqual(["d1:hc", "d1:bd"]);
    expect(lines.every((l) => l.dealInstanceId === "d1")).toBe(true);
  });

  it("removing one deal service removes the whole deal, and only that deal", () => {
    let lines = cartReducer([], { type: "addDeal", instanceId: "d1", dealId: "vip", serviceIds: ["hc", "bd"] });
    lines = add(lines, "x", "sh");
    lines = cartReducer(lines, { type: "remove", key: "d1:hc" });
    expect(lines.map((l) => l.key)).toEqual(["x"]);
  });

  it("removes a single service", () => {
    const lines = cartReducer(add(add([], "a", "hc"), "b", "bd"), { type: "remove", key: "a" });
    expect(lines.map((l) => l.key)).toEqual(["b"]);
  });

  it("sets staff for one line, or for all lines at once", () => {
    let lines = add(add([], "a", "hc"), "b", "bd");
    lines = cartReducer(lines, { type: "setStaff", key: "a", staffId: "arshad" });
    expect(lines.map((l) => l.staffId)).toEqual(["arshad", null]);
    lines = cartReducer(lines, { type: "setAllStaff", staffId: "hamid" });
    expect(lines.map((l) => l.staffId)).toEqual(["hamid", "hamid"]);
  });

  it("clears the cart", () => {
    expect(cartReducer(add([], "a", "hc"), { type: "clear" })).toEqual([]);
  });
});

describe("commonStaff", () => {
  it("returns the shared staff, or null when mixed, unset or empty", () => {
    const base = add(add([], "a", "hc"), "b", "bd");
    expect(commonStaff([])).toBeNull();
    expect(commonStaff(base)).toBeNull();
    expect(commonStaff(cartReducer(base, { type: "setAllStaff", staffId: "s1" }))).toBe("s1");
    expect(commonStaff(cartReducer(base, { type: "setStaff", key: "a", staffId: "s1" }))).toBeNull();
  });
});
