import { describe, expect, it } from "vitest";
import { computeSecurityCode, FIRST_DAY_CODE, stableStringify, type SecurityCodeInput } from "./security-code";

const day = (): SecurityCodeInput => ({
  previousCode: FIRST_DAY_CODE,
  businessDate: "2026-09-21",
  figures: { sale: 6200, counted: 4600 },
  bills: [{ billNo: 1, cash: 800, lines: [{ name: "Haircut", amount: 800 }] }],
  entries: [{ kind: "expense", amount: 300 }],
});

describe("stableStringify", () => {
  it("does not depend on key order", () => {
    expect(stableStringify({ a: 1, b: { d: 1, c: 2 } })).toBe(stableStringify({ b: { c: 2, d: 1 }, a: 1 }));
  });
});

describe("computeSecurityCode", () => {
  it("has the form XXXX-XXXX-XXXX", () => {
    expect(computeSecurityCode(day())).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it("is the same for the same day", () => {
    expect(computeSecurityCode(day())).toBe(computeSecurityCode(day()));
  });

  it("changes if a figure is altered", () => {
    const changed = day();
    changed.figures.sale = 6201;
    expect(computeSecurityCode(changed)).not.toBe(computeSecurityCode(day()));
  });

  it("changes if an old bill is altered", () => {
    const changed = day();
    changed.bills = [{ billNo: 1, cash: 500, lines: [{ name: "Haircut", amount: 500 }] }];
    expect(computeSecurityCode(changed)).not.toBe(computeSecurityCode(day()));
  });

  it("changes if an entry is altered", () => {
    const changed = day();
    changed.entries = [{ kind: "expense", amount: 30 }];
    expect(computeSecurityCode(changed)).not.toBe(computeSecurityCode(day()));
  });

  it("chains: a different previous code gives a different code", () => {
    const later = day();
    later.previousCode = "AAAA-BBBB-CCCC";
    expect(computeSecurityCode(later)).not.toBe(computeSecurityCode(day()));
  });
});
