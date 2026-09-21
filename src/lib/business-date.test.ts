import { describe, expect, it } from "vitest";
import { formatMonth, monthOf, monthStart, nextDate, nextMonth, todayInKarachi } from "./business-date";

describe("months", () => {
  it("identifies a month from a date", () => {
    expect(monthOf("2026-09-21")).toBe("2026-09");
    expect(monthStart("2026-09")).toBe("2026-09-01");
  });

  it("finds the next month, across a year end", () => {
    expect(nextMonth("2026-09")).toBe("2026-10");
    expect(nextMonth("2026-12")).toBe("2027-01");
  });

  it("names a month", () => {
    expect(formatMonth("2026-09")).toBe("September 2026");
  });
});

describe("nextDate", () => {
  it("moves to the next day", () => {
    expect(nextDate("2026-09-21")).toBe("2026-09-22");
  });

  it("rolls over month and year ends", () => {
    expect(nextDate("2026-09-30")).toBe("2026-10-01");
    expect(nextDate("2026-12-31")).toBe("2027-01-01");
  });

  it("handles a leap day", () => {
    expect(nextDate("2028-02-28")).toBe("2028-02-29");
    expect(nextDate("2028-02-29")).toBe("2028-03-01");
  });
});

describe("todayInKarachi", () => {
  it("uses Karachi's date, which is ahead of UTC late in the evening", () => {
    // 20:00 UTC is already 01:00 the next day in Karachi (UTC+5).
    expect(todayInKarachi(new Date("2026-09-21T20:00:00Z"))).toBe("2026-09-22");
  });
});
