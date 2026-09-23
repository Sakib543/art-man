import { describe, expect, it } from "vitest";
import { formatDateTime, priceRange } from "./format";

describe("formatDateTime", () => {
  it("reads the date and time in Karachi, whatever the server's zone", () => {
    // 09:30 UTC is 14:30 in Karachi (UTC+5, no daylight saving).
    expect(formatDateTime(new Date("2026-09-21T09:30:00Z"))).toBe("21 Sep 2026, 14:30");
  });

  it("rolls over to the next day when Karachi is already past midnight", () => {
    // 20:00 UTC on the 21st is 01:00 on the 22nd in Karachi.
    expect(formatDateTime(new Date("2026-09-21T20:00:00Z"))).toBe("22 Sep 2026, 01:00");
  });

  it("takes an ISO string as well as a Date", () => {
    expect(formatDateTime("2026-01-05T06:05:00Z")).toBe("5 Jan 2026, 11:05");
  });
});

describe("priceRange", () => {
  it("shows one price when there is no range", () => {
    expect(priceRange(800, null)).toBe("Rs 800");
  });

  it("shows both ends when there is", () => {
    expect(priceRange(300, 500)).toBe("Rs 300 – 500");
  });

  it("separates thousands at both ends", () => {
    expect(priceRange(3000, 9000)).toBe("Rs 3,000 – 9,000");
  });

  it("falls back to one price if the top is not above the bottom", () => {
    // The form refuses this, but a screen must never print "Rs 500 – 500".
    expect(priceRange(500, 500)).toBe("Rs 500");
    expect(priceRange(500, 400)).toBe("Rs 500");
  });
});
