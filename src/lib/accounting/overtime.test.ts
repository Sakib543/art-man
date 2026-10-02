import { describe, expect, it } from "vitest";
import { formatHours, hasHourDecimals, overtimePay } from "./index";

describe("overtimePay (P3.18)", () => {
  it("is the hours at the karigar's rate: 3 h at Rs 150 is Rs 450", () => {
    expect(overtimePay(3, 150)).toBe(450);
    expect(overtimePay(1.5, 150)).toBe(225);
    expect(overtimePay(0.25, 200)).toBe(50);
  });

  it("rounds once, half up, from exact hundredths of an hour", () => {
    // As floats 1.13 × 150 is 169.49999999999997, which would round to 169.
    expect(1.13 * 150).toBeLessThan(169.5);
    expect(overtimePay(1.13, 150)).toBe(170);
    expect(overtimePay(0.7, 175)).toBe(123);
    // 0.33 × 100 = 33; 2.5 h at Rs 125 = 312.5 → 313.
    expect(overtimePay(0.33, 100)).toBe(33);
    expect(overtimePay(2.5, 125)).toBe(313);
  });

  it("is nothing without a rate", () => {
    expect(overtimePay(4, 0)).toBe(0);
  });
});

describe("hours", () => {
  it("take at most two decimals", () => {
    for (const hours of [1, 1.5, 2.25, 0.75, 1.15, 12]) expect(hasHourDecimals(hours)).toBe(true);
    for (const hours of [1.333, 0.125, 2.005]) expect(hasHourDecimals(hours)).toBe(false);
  });

  it("read as the khata line says them", () => {
    expect(formatHours(3)).toBe("3 h");
    expect(formatHours(1.5)).toBe("1.5 h");
    expect(formatHours(2.25)).toBe("2.25 h");
    expect(formatHours(1.15)).toBe("1.15 h");
  });
});
