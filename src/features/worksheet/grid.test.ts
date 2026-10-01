import { describe, expect, it } from "vitest";
import type { DayBill } from "@/db/queries/day-bills";
import type { OutboxEntry, OutboxItem } from "@/lib/offline/outbox";
import { buildSheet, columnsFor, pendingBillsOf, type PendingBill, type SheetStaff } from "./grid";

const staff: SheetStaff[] = [
  { id: "sherry", name: "Sherry", active: true },
  { id: "hamid", name: "Hamid", active: true },
];

const bill = (billNo: number, over: Partial<DayBill>, lines: DayBill["lines"]): DayBill => ({
  id: `b${billNo}`,
  billNo,
  clientId: null,
  createdAt: "2026-09-21T08:00:00.000Z",
  customerName: null,
  total: lines.reduce((s, l) => s + l.amount, 0),
  cash: 0,
  online: 0,
  bookNo: null,
  discount: 0,
  discountReason: null,
  reversesBillId: null,
  supersedesBillId: null,
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
    expect(sheet.columns[1].cells.map((c) => c.ref)).toEqual(["#2", "#3", "#4"]);
  });

  it("a cancelled bill and its reversal cancel out in the column total", () => {
    expect(sheet.columns[1].total).toBe(1800);
    expect(sheet.columns[1].cells.map((c) => c.status)).toEqual(["active", "cancelled", "reversal"]);
  });

  it("the Owner / Account column holds online money only", () => {
    expect(sheet.owner.cells).toEqual([{ amount: 1000, ref: "#1", label: "Online", status: "active", pending: false }]);
    expect(sheet.owner.total).toBe(1000);
  });

  it("the grand total is all staff columns and matches cash plus online", () => {
    expect(sheet.grandTotal).toBe(6800);
    expect(sheet.cashSales).toBe(5800);
    expect(sheet.onlineSales).toBe(1000);
    expect(sheet.cashSales + sheet.onlineSales).toBe(sheet.grandTotal);
    expect(sheet.pending).toEqual({ count: 0, total: 0 });
  });

  it("has enough rows for the tallest column, and at least one", () => {
    expect(sheet.rowCount).toBe(5);
    expect(buildSheet([], staff).rowCount).toBe(1);
  });
});

describe("buildSheet with bills still on this computer (P2.2e)", () => {
  const pending: PendingBill[] = [
    { slip: "T-1", lines: [{ staffId: "hamid", name: "Haircut", amount: 450 }], cash: 0, online: 450 },
    { slip: "T-2", lines: [{ staffId: "sherry", name: "Shave", amount: 300 }], cash: 300, online: 0 },
  ];
  const sheet = buildSheet(bills, staff, pending);

  it("draws them after the server's bills, by the number on their slip, marked", () => {
    expect(sheet.columns[1].cells.map((c) => [c.ref, c.pending])).toEqual([
      ["#2", false],
      ["#3", false],
      ["#4", false],
      ["T-1", true],
    ]);
    expect(sheet.owner.cells.at(-1)).toEqual({ amount: 450, ref: "T-1", label: "Online", status: "active", pending: true });
  });

  it("counts them in the columns and totals, and says how much of it they are", () => {
    expect(sheet.columns[1].total).toBe(1800 + 450);
    expect(sheet.grandTotal).toBe(6800 + 750);
    expect(sheet.cashSales + sheet.onlineSales).toBe(sheet.grandTotal);
    expect(sheet.pending).toEqual({ count: 2, total: 750 });
    expect(sheet.rowCount).toBe(6);
  });

  it("says what the columns hold of them, by their lines — not by what was paid", () => {
    // Found verifying P2.2e: a bill the server will refuse for a short payment
    // is still drawn at its lines while it waits, so the note must say those.
    const short: PendingBill[] = [{ slip: "T-9", lines: [{ staffId: "hamid", name: "Hair wash", amount: 300 }], cash: 200, online: 50 }];
    expect(buildSheet([], staff, short).pending).toEqual({ count: 1, total: 300 });
  });
});

describe("columnsFor", () => {
  const roster: SheetStaff[] = [...staff, { id: "zaid", name: "Zaid", active: false }];

  it("gives every active staff member a column, in the order given", () => {
    expect(columnsFor(roster, []).map((member) => member.id)).toEqual(["sherry", "hamid"]);
  });

  it("gives an inactive one a column only on a day they have work — on the server or still on this computer", () => {
    const worked = [bill(9, { cash: 300 }, [line("zaid", "Shave", 300)])];
    expect(columnsFor(roster, worked).map((member) => member.id)).toEqual(["sherry", "hamid", "zaid"]);
    const offline: PendingBill[] = [{ slip: "T-1", lines: [{ staffId: "zaid", name: "Shave", amount: 300 }], cash: 300, online: 0 }];
    expect(columnsFor(roster, [], offline).map((member) => member.id)).toEqual(["sherry", "hamid", "zaid"]);
  });
});

describe("pendingBillsOf", () => {
  const queued = (clientId: string, over: Partial<OutboxEntry> = {}): OutboxEntry => ({
    v: 1,
    clientId,
    businessDate: "2026-09-24",
    catalogVersion: null,
    madeAt: "2026-09-29T09:00:00.000Z",
    madeBy: "manager",
    bill: {
      lines: [
        { serviceId: "s-hc", staffId: "hamid", dealId: null, dealInstanceId: null, amount: 450, description: null },
        { serviceId: null, staffId: "sherry", dealId: null, dealInstanceId: null, amount: 200, description: "Beard" },
      ],
      customer: null,
      cash: 600,
      online: 0,
      bookNo: "T-3",
      discount: 50,
      discountReason: "Regular",
    },
    preview: {
      customerName: null,
      // What each line came to, net of the discount, in the order of the lines above.
      lines: [
        { name: "Haircut", staffName: "Hamid", amount: 415 },
        { name: "Other: Beard", staffName: "Sherry", amount: 185 },
      ],
      total: 600,
    },
    rejected: null,
    ...over,
  });

  it("pairs each line's staff member with what it came to", () => {
    expect(pendingBillsOf([queued("a")], "2026-09-24", new Set())).toEqual([
      {
        slip: "T-3",
        lines: [
          { staffId: "hamid", name: "Haircut", amount: 415 },
          { staffId: "sherry", name: "Other: Beard", amount: 185 },
        ],
        cash: 600,
        online: 0,
      },
    ]);
  });

  it("leaves out refused bills, another day's, folder entries, and bills the server already has", () => {
    const items: OutboxItem[] = [
      queued("refused", { rejected: { reason: "No" } }),
      queued("other-day", { businessDate: "2026-09-25" }),
      {
        v: 1,
        type: "folder",
        clientId: "entry",
        businessDate: "2026-09-24",
        madeAt: "2026-09-29T09:00:00.000Z",
        madeBy: "manager",
        entry: { kind: "expense", amount: 100, description: "Tea", paidFrom: "drawer" },
        preview: { staffName: null },
        rejected: null,
      },
      queued("arrived"),
      queued("waiting"),
    ];
    const pending = pendingBillsOf(items, "2026-09-24", new Set(["arrived"]));
    expect(pending).toHaveLength(1);
  });
});
