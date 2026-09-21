import { describe, expect, it } from "vitest";
import { expectedCash, folderTotals, type FolderEntry } from "./index";

const entries: FolderEntry[] = [
  { kind: "expense", amount: 300, paidFrom: "drawer" },
  { kind: "expense", amount: 2000, paidFrom: "owner" },
  { kind: "expense", amount: 600, paidFrom: "drawer" },
  { kind: "staff_advance", amount: 1000, paidFrom: null },
  { kind: "owner_took", amount: 3000, paidFrom: null },
  { kind: "owner_added", amount: 500, paidFrom: null },
];

describe("folderTotals", () => {
  it("separates drawer expenses from ones the owner paid himself", () => {
    const t = folderTotals(entries, 0);
    expect(t.expensesFromDrawer).toBe(900);
    expect(t.expensesFromOwner).toBe(2000);
  });

  it("adds up staff, owner cash and online", () => {
    const t = folderTotals(entries, 2500);
    expect(t).toMatchObject({ staffAdvances: 1000, ownerTook: 3000, ownerAdded: 500, onlineSales: 2500 });
  });

  it("a voided entry and its void row net to zero", () => {
    const withVoid: FolderEntry[] = [
      { kind: "expense", amount: 500, paidFrom: "drawer" },
      { kind: "expense", amount: -500, paidFrom: "drawer" },
      { kind: "expense", amount: 200, paidFrom: "drawer" },
    ];
    expect(folderTotals(withVoid, 0).expensesFromDrawer).toBe(200);
  });

  it("feeds expected cash: owner-paid expenses and online never leave the drawer", () => {
    const t = folderTotals(entries, 2500);
    const cash = expectedCash({
      openingCash: 5000,
      cashSales: 10000,
      ownerAdded: t.ownerAdded,
      expensesFromDrawer: t.expensesFromDrawer,
      staffAdvances: t.staffAdvances,
      staffPayments: t.staffPayments,
      ownerTook: t.ownerTook,
    });
    // 5000 + 10000 + 500 - 900 - 1000 - 0 - 3000
    expect(cash).toBe(10600);
  });
});
