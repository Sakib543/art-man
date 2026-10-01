import { describe, expect, it } from "vitest";
import { cashCountOf, NOTES } from "./cash-count";

describe("the drawer counted note by note (QA-15, spec §5.4(4))", () => {
  it("adds the notes and the coins up to the total", () => {
    expect(cashCountOf({ 5000: "2", 1000: "3", 100: "7", 10: "4" }, "35")).toEqual({ ok: true, total: 13_775 });
  });

  it("reads a blank box as none", () => {
    expect(cashCountOf({}, "")).toEqual({ ok: true, total: 0 });
    expect(cashCountOf({ 500: "", 50: " " }, "")).toEqual({ ok: true, total: 0 });
  });

  it("refuses a count that is not a whole number, and says which note", () => {
    expect(cashCountOf({ 1000: "2.5" }, "")).toEqual({ ok: false, problem: "Write how many Rs 1,000 notes as a whole number." });
    expect(cashCountOf({ 20: "-1" }, "")).toMatchObject({ ok: false });
  });

  it("refuses coins that are not whole rupees", () => {
    expect(cashCountOf({}, "12.5")).toEqual({ ok: false, problem: "Write the coins in whole rupees." });
  });

  it("knows the notes in a Pakistani drawer, largest first", () => {
    expect(NOTES).toEqual([5000, 1000, 500, 100, 50, 20, 10]);
  });
});
