import { describe, expect, it } from "vitest";
import { closeCopyOf, dayFor, isDayCopy, knownIds, type DayCopy } from "./day";

const copy: DayCopy = {
  businessDate: "2026-09-24",
  bills: [],
  entries: [],
  staff: [{ id: "st-arshad", name: "Arshad", active: true }],
  servedAt: "2026-09-29T09:00:00.000Z",
};

describe("isDayCopy", () => {
  it("accepts a copy, and one from a moment no day was open", () => {
    expect(isDayCopy(copy)).toBe(true);
    expect(isDayCopy({ ...copy, businessDate: null })).toBe(true);
    expect(isDayCopy({ ...copy, savedAt: 1 })).toBe(true);
  });

  it.each([
    ["nothing", null],
    ["an HTML page read as text", "<!doctype html>"],
    ["an error body", { error: "Not signed in" }],
    ["a copy without its bills", { ...copy, bills: undefined }],
    ["a copy without its entries", { ...copy, entries: undefined }],
    ["a copy without its time", { ...copy, servedAt: undefined }],
  ])("refuses %s", (_, value) => {
    expect(isDayCopy(value)).toBe(false);
  });
});

describe("dayFor", () => {
  it("gives the copy when it is of the day being worked in", () => {
    expect(dayFor(copy, "2026-09-24")).toBe(copy);
  });

  it("gives nothing for another day's copy, or none — never another day's bills as today's", () => {
    expect(dayFor(copy, "2026-09-25")).toBeNull();
    expect(dayFor({ ...copy, businessDate: null }, "2026-09-24")).toBeNull();
    expect(dayFor(null, "2026-09-24")).toBeNull();
  });
});

describe("closeCopyOf (P2.2f)", () => {
  const close = {
    openingCash: 5000,
    pay: { "st-arshad": { payType: 3, dailyWage: 500, commissionRate: 10 } },
    khata: { "st-arshad": 30 },
  } as const;

  it("gives what closing the day needs", () => {
    expect(closeCopyOf({ ...copy, close })).toEqual(close);
    expect(isDayCopy({ ...copy, close })).toBe(true);
  });

  it("needs no salary, which no day earns (P7.13) — and still reads a copy kept before, which has one", () => {
    const before = { ...close, pay: { "st-arshad": { ...close.pay["st-arshad"], salary: 0 } } };
    expect(closeCopyOf({ ...copy, close: before })).toEqual(before);
  });

  it("gives nothing for a copy kept before P2.2f, or read when no day was open", () => {
    expect(closeCopyOf(copy)).toBeNull();
    expect(closeCopyOf({ ...copy, close: null })).toBeNull();
  });

  it.each([
    ["no opening cash", { ...close, openingCash: undefined }],
    ["a pay type that does not exist", { ...close, pay: { st: { ...close.pay["st-arshad"], payType: 4 } } }],
    ["a pay without its wage", { ...close, pay: { st: { payType: 3, commissionRate: 10 } } }],
    ["a khata balance that is not a number", { ...close, khata: { st: "30" } }],
  ])("refuses one with %s", (_, broken) => {
    expect(closeCopyOf({ ...copy, close: broken as unknown as DayCopy["close"] })).toBeNull();
  });
});

describe("knownIds", () => {
  it("collects the ids the server has, and skips rows saved before ids existed", () => {
    expect(knownIds([{ clientId: "a" }, { clientId: null }, { clientId: "b" }])).toEqual(new Set(["a", "b"]));
  });
});
