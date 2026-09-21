import { describe, expect, it } from "vitest";
import { nextDate, todayInKarachi } from "./business-date";

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
