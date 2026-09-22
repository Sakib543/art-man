import { describe, expect, it } from "vitest";
import type { DayBill } from "@/db/queries/day-bills";
import { receiptOfBill } from "./receipt-of-bill";

const bill = (over: Partial<DayBill> = {}): DayBill => ({
  id: "b1",
  billNo: 12,
  createdAt: "2026-09-24T09:30:00.000Z",
  customerName: "Ashfaq Bhai",
  total: 1100,
  cash: 700,
  online: 400,
  bookNo: null,
  status: "active",
  cancelReason: null,
  reversesBillId: null,
  reversesBillNo: null,
  supersedesBillId: null,
  lines: [
    { name: "Haircut", amount: 800, staffId: "s1", staffName: "Sherry" },
    { name: "Hair wash", amount: 300, staffId: "s2", staffName: "Arshad" },
  ],
  ...over,
});

describe("receiptOfBill", () => {
  it("prints the same slip the sale printed", () => {
    expect(receiptOfBill(bill(), "2026-09-24")).toEqual({
      billNo: 12,
      createdAt: "2026-09-24T09:30:00.000Z",
      businessDate: "2026-09-24",
      customerName: "Ashfaq Bhai",
      lines: [
        { name: "Haircut", amount: 800, staffName: "Sherry", note: null },
        { name: "Hair wash", amount: 300, staffName: "Arshad", note: null },
      ],
      total: 1100,
      cash: 700,
      online: 400,
    });
  });

  it("keeps the lines in the order the list shows them", () => {
    const receipt = receiptOfBill(bill(), "2026-09-24");

    expect(receipt.lines.map((line) => line.name)).toEqual(["Haircut", "Hair wash"]);
  });

  it("shows what was paid, not the sum of the lines", () => {
    // They agree on every bill the app writes. Printing the settled figure
    // means a receipt can never contradict the day's cash.
    const receipt = receiptOfBill(bill({ total: 1100, cash: 1100, online: 0 }), "2026-09-24");

    expect(receipt.total).toBe(1100);
    expect(receipt.cash).toBe(1100);
    expect(receipt.online).toBe(0);
  });

  it("leaves a walk-in without a name", () => {
    expect(receiptOfBill(bill({ customerName: null }), "2026-09-24").customerName).toBeNull();
  });

  it("takes the business date from the day, not from the clock", () => {
    // A bill rung up after midnight still belongs to the day that is open.
    const receipt = receiptOfBill(bill({ createdAt: "2026-09-25T01:10:00.000Z" }), "2026-09-24");

    expect(receipt.businessDate).toBe("2026-09-24");
  });
});
