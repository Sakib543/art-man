import { describe, expect, it } from "vitest";
import { settleLeaver, settlementText, type LeaverContext } from "./leaver";

/** Bilal, on 30,000 a month, leaves on 15 October having been present 12 days of it. */
const bilal: LeaverContext = {
  salaried: true,
  salary: 30_000,
  lastDay: "2026-10-15",
  latestClosedDay: "2026-10-18",
  lastDayMonthClosed: false,
  earliestOpenMonth: "2026-10",
  daysPresent: 12,
};

describe("settleLeaver (P3.19)", () => {
  it("pays the month's salary for the days present: 30,000 × 12 ÷ 31 = 11,613", () => {
    expect(settleLeaver(bilal)).toEqual({ kind: "pay", month: "2026-10", daysPresent: 12, daysInMonth: 31, amount: 11_613 });
  });

  it("divides by the days in the leaving month", () => {
    const september = settleLeaver({ ...bilal, lastDay: "2026-09-20", latestClosedDay: "2026-09-25", earliestOpenMonth: "2026-09", daysPresent: 15 });
    expect(september).toMatchObject({ daysInMonth: 30, amount: 15_000 });
    const february = settleLeaver({ ...bilal, lastDay: "2027-02-10", latestClosedDay: "2027-02-10", earliestOpenMonth: "2027-02", daysPresent: 7 });
    expect(february).toMatchObject({ daysInMonth: 28, amount: 7_500 });
  });

  it("pays nothing for no day present, and says so", () => {
    expect(settleLeaver({ ...bilal, daysPresent: 0 })).toMatchObject({ kind: "pay", amount: 0 });
  });

  it("settles nothing for someone with no salary", () => {
    expect(settleLeaver({ ...bilal, salaried: false })).toEqual({ kind: "none", note: "No monthly salary to settle." });
  });

  it("settles nothing before any day is closed", () => {
    expect(settleLeaver({ ...bilal, latestClosedDay: null })).toMatchObject({ kind: "none" });
  });

  it("refuses a last day that is not closed yet: its attendance is not known", () => {
    expect(settleLeaver({ ...bilal, lastDay: "2026-10-19" })).toEqual({
      kind: "refuse",
      problem: "Choose a day that is already closed: 18 Oct or before. If they worked today, close the day first.",
    });
  });

  it("adds nothing in a month already closed with their full salary", () => {
    expect(settleLeaver({ ...bilal, lastDay: "2026-09-30", lastDayMonthClosed: true })).toEqual({
      kind: "none",
      note: "September 2026 was closed with their full salary, so nothing more is added.",
    });
  });

  it("refuses while an earlier month is open: closing it without them would pay them nothing for it", () => {
    expect(settleLeaver({ ...bilal, earliestOpenMonth: "2026-09" })).toEqual({
      kind: "refuse",
      problem: "Close September 2026 first: their salary for it is added when it closes.",
    });
  });
});

describe("settlementText", () => {
  it("shows the sum the Save will post", () => {
    expect(settlementText(settleLeaver(bilal), 30_000)).toBe(
      "October 2026: 12 of 31 days present. 30,000 × 12 ÷ 31 = Rs 11,613 goes into their khata.",
    );
  });

  it("or why there is none", () => {
    expect(settlementText(settleLeaver({ ...bilal, salaried: false }), 0)).toBe("No monthly salary to settle.");
  });
});
