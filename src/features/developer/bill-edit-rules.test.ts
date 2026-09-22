import { describe, expect, it } from "vitest";
import { checkBillEdit, sumLines, type BillEdit } from "./bill-edit-rules";

const ids = ["a", "b"];

const edit = (over: Partial<BillEdit> = {}): BillEdit => ({
  lines: [
    { id: "a", name: "Haircut", amount: 800, staffId: "s1" },
    { id: "b", name: "Hair wash", amount: 300, staffId: "s2" },
  ],
  cash: 1100,
  online: 0,
  ...over,
});

describe("sumLines", () => {
  it("adds the line amounts", () => {
    expect(sumLines(edit().lines)).toBe(1100);
  });
});

describe("checkBillEdit", () => {
  it("accepts an edit that adds up", () => {
    expect(checkBillEdit(edit(), ids)).toBeNull();
  });

  it("accepts a split between cash and online", () => {
    expect(checkBillEdit(edit({ cash: 600, online: 500 }), ids)).toBeNull();
  });

  it("accepts a changed price when the payment is changed to match", () => {
    const lines = [
      { id: "a", name: "Haircut", amount: 900, staffId: "s1" },
      { id: "b", name: "Hair wash", amount: 300, staffId: "s2" },
    ];
    expect(checkBillEdit({ lines, cash: 1200, online: 0 }, ids)).toBeNull();
  });

  it("refuses a payment that no longer matches the lines", () => {
    expect(checkBillEdit(edit({ cash: 1000 }), ids)).toBe("Cash and online are Rs 100 short of the bill's Rs 1100.");
    expect(checkBillEdit(edit({ cash: 1200 }), ids)).toBe("Cash and online are Rs 100 more than the bill's Rs 1100.");
  });

  it("refuses a line that was added or removed", () => {
    const one = [{ id: "a", name: "Haircut", amount: 1100, staffId: "s1" }];
    expect(checkBillEdit({ lines: one, cash: 1100, online: 0 }, ids)).toBe(
      "The bill's lines cannot be added to or removed here.",
    );
  });

  it("refuses a line that does not belong to this bill", () => {
    const swapped = [
      { id: "a", name: "Haircut", amount: 800, staffId: "s1" },
      { id: "z", name: "Sneaked in", amount: 300, staffId: "s2" },
    ];
    expect(checkBillEdit({ lines: swapped, cash: 1100, online: 0 }, ids)).toBe(
      "The bill's lines cannot be added to or removed here.",
    );
  });

  it("refuses the same line sent twice", () => {
    const twice = [
      { id: "a", name: "Haircut", amount: 550, staffId: "s1" },
      { id: "a", name: "Haircut", amount: 550, staffId: "s1" },
    ];
    expect(checkBillEdit({ lines: twice, cash: 1100, online: 0 }, ids)).toBe("The same line was sent twice.");
  });

  it("refuses a blank name, a negative amount and a missing staff member", () => {
    expect(checkBillEdit(edit({ lines: [{ id: "a", name: " ", amount: 1100, staffId: "s1" }] }), ["a"])).toBe(
      "Every line needs a name.",
    );
    expect(checkBillEdit(edit({ lines: [{ id: "a", name: "Haircut", amount: -5, staffId: "s1" }] }), ["a"])).toBe(
      "An amount cannot be negative.",
    );
    expect(checkBillEdit(edit({ lines: [{ id: "a", name: "Haircut", amount: 1100, staffId: "" }] }), ["a"])).toBe(
      "Every line needs a staff member.",
    );
  });

  it("refuses rupees that are not whole", () => {
    expect(checkBillEdit(edit({ lines: [{ id: "a", name: "Haircut", amount: 10.5, staffId: "s1" }] }), ["a"])).toBe(
      "An amount must be a whole number of rupees.",
    );
    expect(checkBillEdit(edit({ cash: 1100.5 }), ids)).toBe("Cash and online must be whole numbers of rupees.");
  });

  it("refuses a bill that comes to nothing", () => {
    const zero = [
      { id: "a", name: "Haircut", amount: 0, staffId: "s1" },
      { id: "b", name: "Hair wash", amount: 0, staffId: "s2" },
    ];
    expect(checkBillEdit({ lines: zero, cash: 0, online: 0 }, ids)).toBe("A bill must come to more than Rs 0.");
  });
});
