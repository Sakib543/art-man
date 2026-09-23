import { describe, expect, it } from "vitest";
import type { DayBill } from "@/db/queries/day-bills";
import { editReason, foldCorrections } from "./corrections";
import { summarizeBills } from "./summary";

const bill = (over: Partial<DayBill> & { id: string; billNo: number }): DayBill => ({
  createdAt: "2026-09-23T08:00:00.000Z",
  customerName: null,
  total: 0,
  cash: 0,
  online: 0,
  bookNo: null,
  discount: 0,
  discountReason: null,
  status: "active",
  cancelReason: null,
  reversesBillId: null,
  reversesBillNo: null,
  supersedesBillId: null,
  lines: [],
  ...over,
});

/** One correction, as P1.4 writes it: the original, its reversal, the replacement. */
const correction = () => [
  bill({ id: "c", billNo: 6, cash: 800, total: 800, supersedesBillId: "a" }),
  bill({ id: "b", billNo: 5, cash: -300, total: -300, status: "reversal", reversesBillId: "a", reversesBillNo: 4 }),
  bill({ id: "a", billNo: 4, cash: 300, total: 300, status: "cancelled", cancelReason: "Edited: wrong service" }),
];

describe("foldCorrections", () => {
  it("leaves an ordinary day alone", () => {
    const bills = [bill({ id: "x", billNo: 2, cash: 500, total: 500 }), bill({ id: "y", billNo: 1, cash: 800, total: 800 })];

    const folded = foldCorrections(bills);

    expect(folded.map((b) => b.billNo)).toEqual([2, 1]);
    expect(folded.every((b) => b.previous.length === 0)).toBe(true);
  });

  it("shows one line for a correction, not three", () => {
    const folded = foldCorrections(correction());

    expect(folded.map((b) => b.billNo)).toEqual([6]);
  });

  it("keeps the version that was replaced reachable from the line that replaced it", () => {
    const [corrected] = foldCorrections(correction());

    expect(corrected.previous.map((v) => v.billNo)).toEqual([4]);
    expect(editReason(corrected.previous[0])).toBe("wrong service");
  });

  it("still shows a plain cancellation as two lines, because nothing replaced it", () => {
    // A cancelled bill is not a correction. The mistake has to stay visible (spec 11).
    const bills = [
      bill({ id: "b", billNo: 5, cash: -300, total: -300, status: "reversal", reversesBillId: "a", reversesBillNo: 4 }),
      bill({ id: "a", billNo: 4, cash: 300, total: 300, status: "cancelled", cancelReason: "Customer left" }),
    ];

    expect(foldCorrections(bills).map((b) => b.billNo)).toEqual([5, 4]);
  });

  it("folds a bill corrected twice into one line with both earlier versions", () => {
    const bills = [
      bill({ id: "e", billNo: 9, cash: 1000, total: 1000, supersedesBillId: "c" }),
      bill({ id: "d", billNo: 8, cash: -800, total: -800, status: "reversal", reversesBillId: "c", reversesBillNo: 6 }),
      ...correction(),
    ];

    const folded = foldCorrections(bills);

    expect(folded.map((b) => b.billNo)).toEqual([9]);
    expect(folded[0].previous.map((v) => v.billNo)).toEqual([6, 4]);
  });

  it("does not change any total, because a cancelled bill and its reversal add up to zero", () => {
    // The whole safety argument for folding the view: the money is untouched.
    const bills = [bill({ id: "x", billNo: 3, cash: 800, total: 800 }), ...correction()];

    const all = summarizeBills(bills);
    const visible = summarizeBills(foldCorrections(bills));

    expect(all.total).toBe(1600);
    expect(visible.total).toBe(all.total);
    expect(visible.cash).toBe(all.cash);
    expect(visible.online).toBe(all.online);
  });

  it("counts a corrected bill as edited, not cancelled, so the cancellation alert stays honest", () => {
    const summary = summarizeBills(foldCorrections(correction()));

    expect(summary.cancelledBills).toBe(0);
    expect(summary.editedBills).toBe(1);
    expect(summary.paidBills).toBe(1);
  });

  it("survives a row whose previous version is not in the day, without looping", () => {
    const orphan = [bill({ id: "c", billNo: 6, cash: 800, total: 800, supersedesBillId: "gone" })];

    expect(foldCorrections(orphan)[0].previous).toEqual([]);
  });
});

describe("editReason", () => {
  it("drops the prefix editBill stores, so the screen shows what the Owner typed", () => {
    expect(editReason(bill({ id: "a", billNo: 1, cancelReason: "Edited: wrong rate" }))).toBe("wrong rate");
  });

  it("leaves a plain cancellation's reason as it is", () => {
    expect(editReason(bill({ id: "a", billNo: 1, cancelReason: "Customer left" }))).toBe("Customer left");
  });

  it("is null when there is no reason", () => {
    expect(editReason(bill({ id: "a", billNo: 1 }))).toBeNull();
  });
});
