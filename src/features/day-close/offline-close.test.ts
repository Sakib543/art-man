import { describe, expect, it } from "vitest";
import type { DayBill } from "@/db/queries/day-bills";
import type { DayEntry } from "@/db/queries/day-entries";
import type { DayCopy } from "@/lib/offline/day";
import {
  heldBack,
  isOutboxCloseEntry,
  nextToSend,
  type OutboxEntry,
  type OutboxFolderEntry,
  type OutboxItem,
} from "@/lib/offline/outbox";
import { closeEntryOf, closeProblem, differenceOf, localDayOf, reviewLocally, type LocalDay } from "./offline-close";

const DATE = "2026-09-24";

const dayBill = (billNo: number, over: Partial<DayBill>): DayBill => ({
  id: `bill-${billNo}`,
  billNo,
  clientId: null,
  createdAt: "2026-09-24T10:00:00.000Z",
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

const line = (staffId: string, amount: number) => ({ name: "Service", amount, staffId, staffName: staffId });

const dayEntry = (id: string, over: Partial<DayEntry>): DayEntry => ({
  id,
  clientId: null,
  createdAt: "2026-09-24T11:00:00.000Z",
  kind: "expense",
  amount: 0,
  description: null,
  paidFrom: null,
  staffName: null,
  pinConfirmed: false,
  isVoid: false,
  voided: false,
  ...over,
});

const copy: DayCopy = {
  businessDate: DATE,
  bills: [
    dayBill(4, { cash: 0, online: 500, lines: [line("sherry", 500)] }),
    dayBill(3, { status: "reversal", cash: -300, lines: [line("sherry", -300)], reversesBillId: "bill-2" }),
    dayBill(2, { status: "cancelled", cash: 300, lines: [line("sherry", 300)] }),
    dayBill(1, { cash: 800, lines: [line("arshad", 800)], clientId: "sent-bill" }),
  ],
  entries: [
    dayEntry("e2", { kind: "staff_advance", amount: 100, staffName: "Arshad" }),
    dayEntry("e1", { kind: "expense", amount: 200, paidFrom: "drawer", clientId: "sent-entry" }),
  ],
  staff: [
    { id: "arshad", name: "Arshad", active: true },
    { id: "sherry", name: "Sherry", active: true },
    { id: "kamran", name: "Kamran", active: false },
  ],
  servedAt: "2026-09-24T12:00:00.000Z",
  close: {
    openingCash: 5000,
    pay: {
      arshad: { payType: 3, dailyWage: 500, commissionRate: 10 },
      sherry: { payType: 2, dailyWage: 0, commissionRate: 20 },
      kamran: { payType: 1, dailyWage: 0, commissionRate: 0 },
    },
    // The server's balances already carry the advances it has (Arshad's 100).
    khata: { arshad: 30, sherry: -10 },
  },
};

const refused = { reason: "Prices have changed since this bill was made offline.", at: "2026-09-24T13:00:00.000Z" };

const bill = (clientId: string, staffId: string, amount: number, over: Partial<OutboxEntry> = {}): OutboxEntry => ({
  v: 1,
  clientId,
  businessDate: DATE,
  catalogVersion: "c598c580",
  madeAt: "2026-09-24T12:30:00.000Z",
  madeBy: "manager",
  bill: {
    lines: [{ serviceId: "s", staffId, dealId: null, dealInstanceId: null, amount: null, description: null }],
    customer: null,
    cash: amount,
    online: 0,
    bookNo: "T-1",
    discount: 0,
    discountReason: null,
  },
  preview: { customerName: null, lines: [{ name: "Haircut", staffName: staffId, amount }], total: amount },
  rejected: null,
  ...over,
});

const folder = (clientId: string, entry: OutboxFolderEntry["entry"], over: Partial<OutboxFolderEntry> = {}): OutboxFolderEntry => ({
  v: 1,
  type: "folder",
  clientId,
  businessDate: DATE,
  madeAt: "2026-09-24T12:40:00.000Z",
  madeBy: "manager",
  entry,
  preview: { staffName: null },
  rejected: null,
  ...over,
});

const items: OutboxItem[] = [
  bill("t1", "arshad", 450),
  bill("t2", "sherry", 300, { rejected: refused }),
  // Sent, and saved, but its answer was lost: the server lists it as bill #1.
  bill("sent-bill", "arshad", 800),
  folder("f1", { kind: "expense", amount: 50, description: "Tea", paidFrom: "drawer" }),
  folder("f2", { kind: "staff_advance", amount: 200, staffId: "sherry" }),
  folder("sent-entry", { kind: "expense", amount: 200, description: "Towels", paidFrom: "drawer" }),
  // Another day's: none of this day's business.
  bill("other-day", "arshad", 999, { businessDate: "2026-09-23" }),
];

function dayOf(): LocalDay {
  const result = localDayOf(copy, items, DATE);
  if (!result.ok) throw new Error(result.reason);
  return result.day;
}

describe("localDayOf", () => {
  it("cannot close without a copy of the day, or with another day's", () => {
    expect(localDayOf(null, items, DATE)).toMatchObject({ ok: false });
    expect(localDayOf({ ...copy, businessDate: "2026-09-23" }, items, DATE)).toMatchObject({ ok: false });
  });

  it("cannot close on a copy kept before P2.2f, which has none of the close's figures", () => {
    const result = localDayOf({ ...copy, close: undefined }, items, DATE);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("before offline closing existed");
    expect(localDayOf({ ...copy, close: null }, items, DATE).ok).toBe(false);
  });

  it("adds what is still on this computer — waiting or refused — to the server's day, once each", () => {
    const day = dayOf();
    // Four saved bills, two of this computer's; the one the server already lists is not counted again.
    expect(day.bills).toHaveLength(6);
    expect(day.entries).toHaveLength(4);
    expect(day.onThisComputer).toEqual({
      waiting: { bills: 1, entries: 2, closes: 0 },
      refused: { bills: 1, entries: 0, closes: 0 },
    });
    expect(day.openingCash).toBe(5000);
    expect(day.servedAt).toBe(copy.servedAt);
  });

  it("lists the staff the server's close would: the active ones, with their pay, work and khata", () => {
    const day = dayOf();
    expect(day.staff.map((member) => member.id)).toEqual(["arshad", "sherry"]);
    expect(day.staff[0]).toMatchObject({ payType: 3, dailyWage: 500, commissionRate: 10, work: 1250, khataBalance: 30 });
    // 500 online + the cancelled pair netting to 0 + the refused bill's 300. The advance still here comes off.
    expect(day.staff[1]).toMatchObject({ payType: 2, commissionRate: 20, work: 800, khataBalance: -210 });
  });

  it("keeps someone switched off who still has work on the day, as the server does", () => {
    const withKamran = [...items, bill("t3", "kamran", 100)];
    const result = localDayOf(copy, withKamran, DATE);
    expect(result.ok && result.day.staff.map((member) => member.id)).toEqual(["arshad", "sherry", "kamran"]);
  });

  it("takes only the day's pay from a copy kept before P7.13, which still has a salary (QA-08)", () => {
    const sherryThen = { payType: 2 as const, salary: 20000, dailyWage: 0, commissionRate: 20 };
    const old: DayCopy = { ...copy, close: { ...copy.close!, pay: { ...copy.close!.pay, sherry: sherryThen } } };
    const result = localDayOf(old, items, DATE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.day.staff[1]).toMatchObject({ payType: 2, commissionRate: 20 });
      expect(result.day.staff[1]).not.toHaveProperty("salary");
    }
  });
});

describe("reviewLocally", () => {
  it("works expected cash out from all of it", () => {
    const review = reviewLocally(dayOf(), { attendance: {}, payouts: { arshad: 500 }, counted: 5400 });
    // 5000 opening + 1550 cash sales − 250 drawer expenses − 300 advances − 500 paid now.
    expect(review.expected).toBe(5500);
    expect(review.difference).toBe(-100);
    expect(review.onlineSales).toBe(500);
    // `|| 0`: a take-away of nothing is -0, which the screen prints as 0.
    expect(review.breakdown.map(({ label, amount }) => [label, amount || 0])).toEqual([
      ["Opening cash (from yesterday)", 5000],
      ["Cash sales", 1550],
      ["Owner added cash", 0],
      ["Expenses from drawer", -250],
      ["Staff advances", -300],
      ["Staff payments today", -500],
      ["Owner took cash", 0],
    ]);
  });

  it("does not let who was present move the drawer — a daily wage is owed, not paid, until it is handed over", () => {
    const present = reviewLocally(dayOf(), { attendance: { arshad: true }, payouts: {}, counted: 0 });
    const absent = reviewLocally(dayOf(), { attendance: { arshad: false }, payouts: {}, counted: 0 });
    expect(present.expected).toBe(absent.expected);
  });
});

describe("closeProblem", () => {
  const review = { expected: 5500, counted: 5400, difference: -100, breakdown: [], onlineSales: 0 };

  it("asks for a reason when the drawer is short, as the server would", () => {
    expect(closeProblem(review, "  ")).toBe("Write a reason for the shortage before closing.");
    expect(closeProblem(review, "Wrong change")).toBeNull();
  });

  it("needs none when the drawer matches or is over", () => {
    expect(closeProblem({ ...review, counted: 5500, difference: 0 }, "")).toBeNull();
    expect(closeProblem({ ...review, counted: 5600, difference: 100 }, "")).toBeNull();
  });

  it("keeps the reason within what the server takes", () => {
    expect(closeProblem(review, "x".repeat(301))).toBe("Keep the reason to 300 characters");
  });

  it("refuses expected cash below zero, which used to read as a huge Extra (QA-29)", () => {
    const belowZero = { ...review, expected: -11_069_885, counted: 31_225, difference: 11_101_110 };
    expect(closeProblem(belowZero, "")).toBe(
      "Expected cash comes to -Rs 11,069,885: more is recorded as leaving the drawer than it held. Check the payments to staff and today's Daily folders, then count again.",
    );
    expect(closeProblem({ ...review, expected: 0, counted: 0, difference: 0 }, "")).toBeNull();
  });
});

describe("closeEntryOf", () => {
  const review = reviewLocally(dayOf(), { attendance: { arshad: true, sherry: false }, payouts: { arshad: 500, sherry: 0 }, counted: 5400 });
  const entry = closeEntryOf({
    clientId: "close-1",
    businessDate: DATE,
    madeBy: "manager",
    madeAt: "2026-09-24T23:10:00.000Z",
    attendance: { arshad: true, sherry: false },
    payouts: { arshad: 500, sherry: 0 },
    counted: 5400,
    reason: "  Wrong change  ",
    review,
    staffNames: { arshad: "Arshad", sherry: "Sherry" },
  });

  it("keeps what the server needs, and the expected cash the count was compared with", () => {
    expect(entry.close).toEqual({
      attendance: { arshad: true, sherry: false },
      payouts: { arshad: 500 },
      counted: 5400,
      reason: "Wrong change",
      expected: 5500,
    });
    expect(differenceOf(entry.close)).toBe(-100);
  });

  it("keeps what was shown, to show it again without the server", () => {
    expect(entry.preview.payouts).toEqual([{ name: "Arshad", amount: 500 }]);
    expect(entry.preview.breakdown).toBe(review.breakdown);
    expect(entry.preview.onlineSales).toBe(500);
  });

  it("is an outbox close the store reads back, waiting to be sent", () => {
    expect(isOutboxCloseEntry(entry)).toBe(true);
    expect(entry).toMatchObject({ v: 1, type: "close", rejected: null });
  });

  it("leaves no reason when none was written", () => {
    const quiet = closeEntryOf({ ...entry.close, clientId: "c", businessDate: DATE, madeBy: "m", madeAt: entry.madeAt, reason: " ", review, staffNames: {} });
    expect(quiet.close.reason).toBeNull();
  });

  it("goes after the day's bills and entries, and waits while one of them is refused", () => {
    const queue: OutboxItem[] = [...items, entry];
    expect(heldBack(entry, queue)).toBe(true);
    // Only the other day's bill of the waiting ones is left once today's are sent.
    const todaySent = queue.filter((item) => item.businessDate !== DATE || item === entry || item.rejected !== null);
    expect(nextToSend(todaySent)?.clientId).toBe("other-day");
    const refusedLeft = todaySent.filter((item) => item.businessDate === DATE);
    expect(nextToSend(refusedLeft)).toBeNull();
    expect(nextToSend([entry])?.clientId).toBe("close-1");
  });
});
