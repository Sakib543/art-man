import { describe, expect, it } from "vitest";
import { niceScale } from "./chart";

describe("niceScale", () => {
  it("rounds the top up to a clean number", () => {
    const { max, ticks } = niceScale(34720);
    expect(max).toBeGreaterThanOrEqual(34720);
    expect(max).toBe(40000);
    expect(ticks).toEqual([0, 10000, 20000, 30000, 40000]);
  });

  it("always starts at zero and always covers the data", () => {
    for (const value of [1, 7, 480, 1200, 5000, 23456, 987654]) {
      const { max, ticks } = niceScale(value);
      expect(ticks[0]).toBe(0);
      expect(ticks.at(-1)).toBe(max);
      expect(max).toBeGreaterThanOrEqual(value);
    }
  });

  it("uses evenly spaced ticks", () => {
    const { ticks } = niceScale(2300);
    const gaps = ticks.slice(1).map((t, i) => t - ticks[i]);
    expect(new Set(gaps).size).toBe(1);
  });

  it("copes with an empty or zero series", () => {
    expect(niceScale(0)).toEqual({ max: 1, ticks: [0, 1] });
  });
});
