import { describe, expect, it } from "vitest";
import { computeSecurityCode, FIRST_DAY_CODE, securityCodeAsBefore, stableStringify, type SecurityCodeInput } from "./security-code";

const bill = (lines: SecurityCodeInput["bills"][number]["lines"], cash = 800) => ({
  billNo: 1,
  cash,
  online: 0,
  customerId: null,
  reversesBillId: null,
  lines,
});

const day = (): SecurityCodeInput => ({
  previousCode: FIRST_DAY_CODE,
  businessDate: "2026-09-21",
  figures: { sale: 6200, counted: 4600 },
  bills: [bill([{ name: "Haircut", amount: 800, staffId: "arshad" }])],
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
    changed.bills = [bill([{ name: "Haircut", amount: 500, staffId: "arshad" }], 500)];
    expect(computeSecurityCode(changed)).not.toBe(computeSecurityCode(day()));
  });

  it("changes if an entry is altered", () => {
    const changed = day();
    changed.entries = [{ kind: "expense", amount: 30 }];
    expect(computeSecurityCode(changed)).not.toBe(computeSecurityCode(day()));
  });

  it("does not depend on the order the database hands a bill's lines back in (QA-27)", () => {
    const wash = { name: "Hair wash", amount: 300, staffId: "sherry" };
    const cut = { name: "Haircut", amount: 800, staffId: "arshad" };
    const shave = { name: "Shave", amount: 300, staffId: "arshad" };
    const oneWay = { ...day(), bills: [bill([cut, wash, shave], 1400)] };
    const another = { ...day(), bills: [bill([shave, cut, wash], 1400)] };
    expect(computeSecurityCode(another)).toBe(computeSecurityCode(oneWay));
    // Still a change when a line itself changes.
    const moved = { ...day(), bills: [bill([cut, { ...wash, staffId: "arshad" }, shave], 1400)] };
    expect(computeSecurityCode(moved)).not.toBe(computeSecurityCode(oneWay));
  });

  it("is the old code for a day whose bills have one line each or lines already in order", () => {
    expect(computeSecurityCode(day())).toBe(securityCodeAsBefore(day()));
  });

  it("kept the order it was given before P7.8, which is what made it depend on the database", () => {
    const cut = { name: "Haircut", amount: 800, staffId: "arshad" };
    const wash = { name: "Hair wash", amount: 300, staffId: "sherry" };
    const asStored = { ...day(), bills: [bill([cut, wash], 1100)] };
    const turned = { ...day(), bills: [bill([wash, cut], 1100)] };
    expect(securityCodeAsBefore(turned)).not.toBe(securityCodeAsBefore(asStored));
    expect(computeSecurityCode(turned)).toBe(computeSecurityCode(asStored));
  });

  it("chains: a different previous code gives a different code", () => {
    const later = day();
    later.previousCode = "AAAA-BBBB-CCCC";
    expect(computeSecurityCode(later)).not.toBe(computeSecurityCode(day()));
  });
});
