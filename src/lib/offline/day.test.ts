import { describe, expect, it } from "vitest";
import { dayFor, isDayCopy, knownIds, type DayCopy } from "./day";

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

describe("knownIds", () => {
  it("collects the ids the server has, and skips rows saved before ids existed", () => {
    expect(knownIds([{ clientId: "a" }, { clientId: null }, { clientId: "b" }])).toEqual(new Set(["a", "b"]));
  });
});
