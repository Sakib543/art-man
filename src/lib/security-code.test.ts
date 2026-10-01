import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  computeSecurityCode,
  FIRST_DAY_CODE,
  stableStringify,
  type SecurityCodeInput,
} from "./security-code";

const bill = (lines: SecurityCodeInput["bills"][number]["lines"], cash = 800) => ({
  billNo: 1,
  cash,
  online: 0,
  customerId: null,
  reversesBillId: null,
  lines,
  discount: 0,
  discountReason: null,
  bookNo: null,
  cancelReason: null,
});

const arshad = { staffId: "arshad", present: true, payType: 3, salary: 0, dailyWage: 600, commissionRate: 10 };
const sherry = { staffId: "sherry", present: false, payType: 2, salary: 20000, dailyWage: 0, commissionRate: 20 };

const day = (): SecurityCodeInput => ({
  previousCode: FIRST_DAY_CODE,
  businessDate: "2026-09-21",
  figures: { sale: 6200, counted: 4600 },
  diffReason: null,
  bills: [bill([{ name: "Haircut", amount: 800, staffId: "arshad" }])],
  entries: [{ kind: "expense", amount: 300 }],
  attendance: [arshad, sherry],
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

  it("chains: a different previous code gives a different code", () => {
    const later = day();
    later.previousCode = "AAAA-BBBB-CCCC";
    expect(computeSecurityCode(later)).not.toBe(computeSecurityCode(day()));
  });
});

describe("what the code covers since P7.14 (QA-12)", () => {
  const changes: [string, (input: SecurityCodeInput) => void][] = [
    ["a discount", (input) => void (input.bills[0].discount = 100)],
    ["a discount's reason", (input) => void (input.bills[0].discountReason = "Regular")],
    ["a slip number", (input) => void (input.bills[0].bookNo = "17")],
    ["a cancellation's reason", (input) => void (input.bills[0].cancelReason = "Customer left")],
    ["the drawer's reason", (input) => void (input.diffReason = "Change given twice")],
    ["who was present", (input) => void (input.attendance[1] = { ...sherry, present: true })],
    ["the pay a day was settled on", (input) => void (input.attendance[0] = { ...arshad, dailyWage: 900 })],
    ["someone added to the staff list", (input) => void input.attendance.push({ ...arshad, staffId: "newbie" })],
  ];

  it.each(changes)("changes with %s", (_, change) => {
    const changed = day();
    change(changed);
    expect(computeSecurityCode(changed)).not.toBe(computeSecurityCode(day()));
  });

  it("does not depend on the order the staff list comes back in", () => {
    expect(computeSecurityCode({ ...day(), attendance: [sherry, arshad] })).toBe(computeSecurityCode(day()));
  });
});

describe("sealed with the server's key (P7.8b, QA-26)", () => {
  const key = Buffer.alloc(32, 7);
  const other = Buffer.alloc(32, 8);

  it("is the HMAC-SHA256 of what the plain code hashes, so the key is all that is new", () => {
    // day() has its lines and staff list in the order the code puts them in already.
    const hex = createHmac("sha256", key).update(stableStringify(day())).digest("hex").slice(0, 12).toUpperCase();
    expect(computeSecurityCode(day(), key)).toBe(`${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`);
  });

  it("cannot be worked out without the key: the plain code and another key's are both different", () => {
    const keyed = computeSecurityCode(day(), key);
    expect(keyed).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(keyed).not.toBe(computeSecurityCode(day()));
    expect(keyed).not.toBe(computeSecurityCode(day(), other));
    expect(computeSecurityCode(day(), key)).toBe(keyed);
  });

  it("covers what the plain code covers, in the same fixed order", () => {
    const changed = day();
    changed.figures = { ...changed.figures, counted: 4500 };
    expect(computeSecurityCode(changed, key)).not.toBe(computeSecurityCode(day(), key));

    const cut = { name: "Haircut", amount: 800, staffId: "arshad" };
    const wash = { name: "Hair wash", amount: 300, staffId: "sherry" };
    expect(computeSecurityCode({ ...day(), bills: [bill([cut, wash], 1100)] }, key)).toBe(
      computeSecurityCode({ ...day(), bills: [bill([wash, cut], 1100)] }, key),
    );
  });

  it("leaves the plain code as it was without a key", () => {
    expect(computeSecurityCode(day(), null)).toBe(computeSecurityCode(day()));
  });
});
