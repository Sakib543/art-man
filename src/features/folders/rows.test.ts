import { describe, expect, it } from "vitest";
import type { DayBill } from "@/db/queries/day-bills";
import { folderTotals } from "@/lib/accounting";
import { folderSyncRequestOf, isOutboxFolderEntry, type OutboxEntry, type OutboxItem } from "@/lib/offline/outbox";
import { entrySchema } from "./schemas";
import {
  folderEntryText,
  offlineEntryOf,
  offlineEntryProblem,
  onlineRowsOf,
  pendingEntryRows,
  pendingOnlineRows,
  type OfflineEntryParts,
} from "./rows";

const DAY = "2026-09-24";

const expense: OfflineEntryParts = {
  clientId: "11111111-1111-4111-8111-111111111111",
  businessDate: DAY,
  madeBy: "manager",
  madeAt: "2026-09-29T09:05:00.000Z",
  entry: { kind: "expense", amount: 150, description: "  Tea  ", paidFrom: "drawer" },
  staffNames: {},
};

const advance: OfflineEntryParts = {
  ...expense,
  clientId: "22222222-2222-4222-8222-222222222222",
  madeAt: "2026-09-29T09:10:00.000Z",
  entry: { kind: "staff_advance", amount: 500, staffId: "st-arshad" },
  staffNames: { "st-arshad": "Arshad" },
};

const bill = (clientId: string, online: number, over: Partial<OutboxEntry> = {}): OutboxEntry => ({
  v: 1,
  clientId,
  businessDate: DAY,
  catalogVersion: "c598c580",
  madeAt: "2026-09-29T09:07:00.000Z",
  madeBy: "manager",
  bill: {
    lines: [{ serviceId: "s-wash", staffId: "st-arshad", dealId: null, dealInstanceId: null, amount: null, description: null }],
    customer: null,
    cash: 300 - online,
    online,
    bookNo: "T-2",
    discount: 0,
    discountReason: null,
  },
  preview: { customerName: "Kamran", lines: [{ name: "Hair wash", staffName: "Arshad", amount: 300 }], total: 300 },
  rejected: null,
  ...over,
});

describe("offlineEntryOf", () => {
  it("keeps an expense for the outbox, trimmed as the server will trim it", () => {
    const item = offlineEntryOf(expense);
    expect(isOutboxFolderEntry(item)).toBe(true);
    expect(item.entry).toEqual({ kind: "expense", amount: 150, description: "Tea", paidFrom: "drawer" });
    expect(item.preview.staffName).toBeNull();
    expect(item.rejected).toBeNull();
  });

  it("keeps an advance with the staff member's name, for the list", () => {
    const item = offlineEntryOf(advance);
    expect(item.preview.staffName).toBe("Arshad");
    expect(folderEntryText(item)).toBe("Advance to Arshad");
  });

  it("sends the server what it checks, not what only this browser needs", () => {
    const request = folderSyncRequestOf(offlineEntryOf(advance));
    expect(request).toEqual({
      v: 1,
      type: "folder",
      clientId: advance.clientId,
      businessDate: DAY,
      madeAt: advance.madeAt,
      madeBy: "manager",
      entry: { kind: "staff_advance", amount: 500, staffId: "st-arshad" },
    });
  });

  it("names nobody rather than inventing a name it does not have", () => {
    const item = offlineEntryOf({ ...advance, staffNames: {} });
    expect(item.preview.staffName).toBeNull();
    expect(folderEntryText(item)).toBe("Advance to a staff member");
  });
});

describe("pendingEntryRows", () => {
  const items: OutboxItem[] = [offlineEntryOf(expense), bill("b-1", 0), offlineEntryOf(advance)];

  it("lists the day's waiting entries, newest first, as rows with no Cancel of their own", () => {
    const rows = pendingEntryRows(items, DAY, new Set());
    expect(rows.map((row) => row.description)).toEqual(["Advance to Arshad", "Tea"]);
    expect(rows.every((row) => row.pending && !row.voided && !row.isVoid)).toBe(true);
    expect(rows[0]).toMatchObject({ id: advance.clientId, kind: "staff_advance", amount: 500, staffName: "Arshad" });
    expect(rows[1]).toMatchObject({ kind: "expense", paidFrom: "drawer", createdAt: expense.madeAt });
  });

  it("leaves out what the server has already listed — sent, but its answer not yet in", () => {
    expect(pendingEntryRows(items, DAY, new Set([advance.clientId])).map((row) => row.id)).toEqual([expense.clientId]);
  });

  it("leaves out another day's entries, and refused ones, which wait in Needs attention", () => {
    const refused = { ...offlineEntryOf(expense), rejected: { reason: "No" } };
    const otherDay = { ...offlineEntryOf(advance), businessDate: "2026-09-25" };
    expect(pendingEntryRows([refused, otherDay], DAY, new Set())).toEqual([]);
  });

  it("adds into the folders' totals like any entry", () => {
    const totals = folderTotals(pendingEntryRows(items, DAY, new Set()), 0);
    expect(totals).toMatchObject({ expensesFromDrawer: 150, staffAdvances: 500 });
  });
});

describe("pendingOnlineRows", () => {
  it("lists the day's waiting bills paid online, by the number on their slip", () => {
    const rows = pendingOnlineRows([bill("b-1", 0), bill("b-2", 300), bill("b-3", 100, { businessDate: "2026-09-25" })], DAY, new Set());
    expect(rows).toEqual([
      {
        key: "b-2",
        ref: "T-2",
        clientId: "b-2",
        createdAt: "2026-09-29T09:07:00.000Z",
        customerName: "Kamran",
        amount: 300,
        pending: true,
      },
    ]);
  });

  it("leaves out a bill the server already has", () => {
    expect(pendingOnlineRows([bill("b-2", 300)], DAY, new Set(["b-2"]))).toEqual([]);
  });
});

describe("onlineRowsOf", () => {
  const dayBill = (billNo: number, online: number): DayBill => ({
    id: `id-${billNo}`,
    billNo,
    clientId: `c-${billNo}`,
    createdAt: "2026-09-24T08:00:00.000Z",
    customerName: null,
    total: 500,
    cash: 500 - online,
    online,
    bookNo: null,
    discount: 0,
    discountReason: null,
    status: "active",
    cancelReason: null,
    reversesBillId: null,
    reversesBillNo: null,
    supersedesBillId: null,
    lines: [],
  });

  it("keeps the bills with online money, as the server's Online folder does, reversals included", () => {
    const rows = onlineRowsOf([dayBill(3, -200), dayBill(2, 0), dayBill(1, 200)]);
    expect(rows.map((row) => [row.ref, row.amount, row.clientId, row.pending])).toEqual([
      ["#3", -200, "c-3", false],
      ["#1", 200, "c-1", false],
    ]);
  });
});

describe("offlineEntryProblem", () => {
  const ok = (entry: Parameters<typeof offlineEntryProblem>[0]) => {
    expect(offlineEntryProblem(entry)).toBeNull();
    // And the server agrees: what passes here passes `entrySchema` too.
    expect(entrySchema.safeParse({ ...entry, clientId: expense.clientId }).success).toBe(true);
  };

  it("lets through what the server would save", () => {
    ok({ kind: "expense", amount: 150, description: "Tea", paidFrom: "drawer" });
    ok({ kind: "staff_advance", amount: 10_000_000, staffId: "22222222-2222-4222-8222-222222222222" });
  });

  it.each([
    ["no amount", { kind: "expense", amount: 0, description: "Tea", paidFrom: "drawer" }, "Enter an amount in whole rupees"],
    ["a part of a rupee", { kind: "expense", amount: 10.5, description: "Tea", paidFrom: "drawer" }, "Enter an amount in whole rupees"],
    ["too much", { kind: "expense", amount: 10_000_001, description: "Tea", paidFrom: "drawer" }, "An entry can be at most Rs 10,000,000"],
    ["an expense of nothing in particular", { kind: "expense", amount: 10, description: "   ", paidFrom: "drawer" }, "Say what the expense was for"],
    ["a description too long", { kind: "expense", amount: 10, description: "x".repeat(121), paidFrom: "drawer" }, "Keep the description to 120 characters"],
    ["an advance to nobody", { kind: "staff_advance", amount: 10, staffId: "" }, "Choose a staff member"],
  ] as const)("stops %s before it is kept, as the server would", (_, entry, message) => {
    expect(offlineEntryProblem(entry)).toBe(message);
    expect(entrySchema.safeParse({ ...entry, clientId: expense.clientId }).success).toBe(false);
  });
});