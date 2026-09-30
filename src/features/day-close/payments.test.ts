import { describe, expect, it } from "vitest";
import { dayEarning } from "@/lib/accounting";
import { checkPayouts, overOwedText } from "./payments";
import type { CloseStaffRow } from "./types";

const row = (id: string, over: Partial<CloseStaffRow>): CloseStaffRow => ({
  id,
  name: id,
  payType: 3,
  dailyWage: 0,
  commissionRate: 0,
  work: 0,
  khataBalance: 0,
  ...over,
});

const bilal = row("Bilal", { dailyWage: 1110 });
const arshad = row("Arshad", { payType: 2, commissionRate: 10, work: 5000, khataBalance: 300 });
const staff = [bilal, arshad];
const earnings = Object.fromEntries(staff.map((s) => [s.id, dayEarning(s, s.work, true)]));

describe("checkPayouts", () => {
  it("reads every box as whole rupees; a blank box is no payment", () => {
    expect(checkPayouts(staff, earnings, { Bilal: "1110", Arshad: "" })).toEqual({
      ok: true,
      amounts: { Bilal: 1110, Arshad: 0 },
      overOwed: [],
    });
  });

  it.each(["1110.5", "-500", "1e3"])("refuses %s with a message, naming whose box it is (QA-14)", (typed) => {
    expect(checkPayouts(staff, earnings, { Bilal: typed, Arshad: "0" })).toEqual({
      ok: false,
      problem: "Enter what was paid to Bilal in whole rupees, e.g. 700.",
    });
  });

  it("asks about a payment above what is owed — the pre-filled 1,110 typed over to 11,101,110 (QA-29)", () => {
    const check = checkPayouts(staff, earnings, { Bilal: "11101110", Arshad: "800" });
    // Arshad is owed 300 in the khata plus 500 commission today: 800 is not above it.
    expect(check).toEqual({ ok: true, amounts: { Bilal: 11101110, Arshad: 800 }, overOwed: [{ name: "Bilal", paid: 11101110, owed: 1110 }] });
  });

  it("counts a debit in the khata against what is owed", () => {
    const inDebit = row("Kamran", { dailyWage: 700, khataBalance: -1000 });
    const check = checkPayouts([inDebit], { Kamran: dayEarning(inDebit, 0, true) }, { Kamran: "700" });
    expect(check.ok && check.overOwed).toEqual([{ name: "Kamran", paid: 700, owed: -300 }]);
  });
});

describe("overOwedText", () => {
  it("says who, how much, and what pressing again does", () => {
    expect(overOwedText([{ name: "Bilal", paid: 11101110, owed: 1110 }, { name: "Kamran", paid: 700, owed: -300 }])).toBe(
      "Bilal is being paid Rs 11,101,110 but is owed Rs 1,110; Kamran is being paid Rs 700 but is owed nothing. Check the amount, or press Continue again to pay it: the difference stays in the khata as money taken.",
    );
  });
});
