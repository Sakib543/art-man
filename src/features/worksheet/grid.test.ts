import { describe, expect, it } from "vitest";
import type { DayBill } from "@/db/queries/day-bills";
import { buildSheet, type SheetStaff } from "./grid";

const staff: SheetStaff[] = [
  { id: "sherry", name: "Sherry", active: true },
  { id: "hamid", name: "Hamid", active: true },
];

const bill = (billNo: number, over: Partial<DayBill>, lines: DayBill["lines"]): DayBill => ({
  id: `b${billNo}`,
  billNo,
  createdAt: "2026-09-21T08:00:00.000Z",
  customerName: null,
  total: lines.reduce((s, l) => s + l.amount, 0),
  cash: 0,
  online: 0,
  bookNo: null,
  status: "active",
  cancelReason: null,
  reversesBillNo: null,
  lines,
  ...over,
});

const line = (staffId: string, name: string, amount: number) => ({
  name,
  amount,
  staffId,
  staffName: staffId === "sherry" ? "Sherry" : "Hamid",
});

// Newest first, as the database returns them.
const bills: DayBill[] = [
  bill(4, { cash: -500, status: "reversal", reversesBillNo: 3 }, [line("hamid", "Reversal of #3", -500)]),
  bill(3, { cash: 500, status: "cancelled" }, [line("hamid", "Kids haircut", 500)]),
  bill(2, { cash: 1800 }, [line("hamid", "Facial", 1800)]),
  bill(1, { cash: 4000, online: 1000 }, [line("sherry", "Deep facial", 2500), line("sherry", "Hair color", 1500), line("sherry", "Beard trim", 400), line("sherry", "Shave", 300), line("sherry", "Hair wash", 300)]),
];

describe("buildSheet", () => {
  const sheet = buildSheet(bills, staff);

  it("puts each staff member's lines in their own column, oldest first", () => {
    const sherry = sheet.columns[0];
    expect(sherry.cells.map((c) => c.amount)).toEqual([2500, 1500, 400, 300, 300]);
    expect(sherry.total).toBe(5000);
    expect(sheet.columns[1].cells.map((c) => c.billNo)).toEqual([2, 3, 4]);
  });

  it("a cancelled bill and its reversal cancel out in the column total", () => {
    expect(sheet.columns[1].total).toBe(1800);
    expect(sheet.columns[1].cells.map((c) => c.status)).toEqual(["active", "cancelled", "reversal"]);
  });

  it("the Owner / Account column holds online money only", () => {
    expect(sheet.owner.cells).toEqual([{ amount: 1000, billNo: 1, label: "Online", status: "active" }]);
    expect(sheet.owner.total).toBe(1000);
  });

  it("the grand total is all staff columns and matches cash plus online", () => {
    expect(sheet.grandTotal).toBe(6800);
    expect(sheet.cashSales).toBe(5800);
    expect(sheet.onlineSales).toBe(1000);
    expect(sheet.cashSales + sheet.onlineSales).toBe(sheet.grandTotal);
  });

  it("has enough rows for the tallest column, and at least one", () => {
    expect(sheet.rowCount).toBe(5);
    expect(buildSheet([], staff).rowCount).toBe(1);
  });
});
