import { describe, expect, it } from "vitest";
import { expectedCashBreakdown, settledStaff, summarizeDay, type Bill, type DayCloseInput, type StaffPay } from "./index";

const sherry: StaffPay = { payType: 3, salary: 0, dailyWage: 800, commissionRate: 10 };
const hamid: StaffPay = { payType: 2, salary: 40000, dailyWage: 0, commissionRate: 10 };

const bill = (staffId: string, amount: number, cash: number, online = 0): Bill => ({
  status: "active",
  lines: [{ staffId, amount }],
  cash,
  online,
});

const base = (): DayCloseInput => ({
  openingCash: 5000,
  bills: [bill("sherry", 5000, 4000, 1000), bill("hamid", 1200, 1200)],
  entries: [
    { kind: "expense", amount: 300, paidFrom: "drawer" },
    { kind: "expense", amount: 2000, paidFrom: "owner" },
    { kind: "staff_advance", amount: 1000, paidFrom: null },
    { kind: "owner_took", amount: 3000, paidFrom: null },
  ],
  staff: [
    { id: "sherry", pay: sherry, present: true },
    { id: "hamid", pay: hamid, present: true },
  ],
  payouts: { sherry: 1300 },
});

describe("summarizeDay", () => {
  it("splits sales into cash and online", () => {
    const s = summarizeDay(base());
    expect(s).toMatchObject({ cash: 5200, online: 1000, sale: 6200 });
  });

  it("Sherry earns 800 wage + 10% of 5000 = 1300 (spec 6.2)", () => {
    const s = summarizeDay(base());
    expect(s.earnings.sherry).toEqual({ work: 5000, commission: 500, wage: 800, total: 1300 });
    expect(s.earnings.hamid.total).toBe(120);
    expect(s.staffEarned).toBe(1420);
  });

  it("an absent daily-wage staff member earns no wage", () => {
    const input = base();
    input.staff[0].present = false;
    expect(summarizeDay(input).earnings.sherry.wage).toBe(0);
  });

  it("expected cash follows the drawer formula, including payments made at close", () => {
    // 5000 + 5200 + 0 - 300 - 1000 - 1300 - 3000
    expect(summarizeDay(base()).expectedCash).toBe(4600);
  });

  it("online sales never enter the drawer: same cash sales, same expected cash", () => {
    const moreOnline = base();
    moreOnline.bills = [bill("sherry", 6000, 4000, 2000), bill("hamid", 1200, 1200)];
    const a = summarizeDay(base());
    const b = summarizeDay(moreOnline);
    expect(b.online).toBe(2000);
    expect(b.expectedCash).toBe(a.expectedCash);
  });

  it("an expense the owner paid himself does not reduce the drawer", () => {
    const withoutOwnerExpense = base();
    withoutOwnerExpense.entries = withoutOwnerExpense.entries.filter((e) => e.paidFrom !== "owner");
    expect(summarizeDay(withoutOwnerExpense).expectedCash).toBe(summarizeDay(base()).expectedCash);
  });

  it("day profit = sale - all expenses - staff earned; advances and owner cash are not expenses", () => {
    const s = summarizeDay(base());
    expect(s.expenses).toBe(2300);
    expect(s.dayProfit).toBe(6200 - 2300 - 1420);
  });

  it("staff paid counts advances plus payments made at close", () => {
    expect(summarizeDay(base()).staffPaid).toBe(1000 + 1300);
  });

  it("a cancelled bill and its reversal cancel out of sales and work", () => {
    const input = base();
    input.bills.push(
      { status: "cancelled", lines: [{ staffId: "hamid", amount: 500 }], cash: 500, online: 0 },
      { status: "reversal", lines: [{ staffId: "hamid", amount: -500 }], cash: -500, online: 0 },
    );
    const s = summarizeDay(input);
    expect(s.cash).toBe(5200);
    expect(s.earnings.hamid.work).toBe(1200);
  });
});

describe("expectedCashBreakdown", () => {
  it("adds up to the expected cash", () => {
    const input = base();
    const s = summarizeDay(input);
    const rows = expectedCashBreakdown(input.openingCash, s);
    expect(rows.reduce((sum, r) => sum + r.amount, 0)).toBe(s.expectedCash);
  });
});

describe("settledStaff", () => {
  const wage = (dailyWage: number): StaffPay => ({ payType: 3, salary: 0, dailyWage, commissionRate: 0 });
  const commission = (commissionRate: number): StaffPay => ({ payType: 2, salary: 20000, dailyWage: 0, commissionRate });
  // Today's staff, after the day closed: Bilal's wage 700 → 900, Arshad 10% → 20%, Karim left, Newbie joined.
  const now = [
    { id: "bilal", pay: wage(900) },
    { id: "arshad", pay: commission(20) },
    { id: "karim", pay: wage(500) },
    { id: "newbie", pay: wage(1000) },
  ];
  const saved = [
    { staffId: "bilal", present: true, pay: wage(700) },
    { staffId: "arshad", present: true, pay: commission(10) },
    { staffId: "karim", present: true, pay: wage(500) },
  ];

  it("settles the day's own list on the day's own terms (the QA-04 scenario)", () => {
    expect(settledStaff(saved, now, new Set(["arshad"]))).toEqual([
      { id: "bilal", pay: wage(700), present: true },
      { id: "arshad", pay: commission(10), present: true },
      { id: "karim", pay: wage(500), present: true },
    ]);
  });

  it("keeps who was marked absent absent", () => {
    const absent = saved.map((member) => (member.staffId === "bilal" ? { ...member, present: false } : member));
    expect(settledStaff(absent, now, new Set())[0]).toEqual({ id: "bilal", pay: wage(700), present: false });
  });

  it("falls back to today's terms for a day closed before P7.3, but still only for that day's list", () => {
    const legacy = saved.map((member) => ({ ...member, pay: null }));
    expect(settledStaff(legacy, now, new Set()).map((member) => [member.id, member.pay])).toEqual([
      ["bilal", wage(900)],
      ["arshad", commission(20)],
      ["karim", wage(500)],
    ]);
  });

  it("gives someone whose work was moved onto the day commission and no wage", () => {
    expect(settledStaff(saved, now, new Set(["newbie"]))).toContainEqual({ id: "newbie", pay: wage(1000), present: false });
  });

  it("keeps the order of the staff list", () => {
    const reversed = [...saved].reverse();
    expect(settledStaff(reversed, now, new Set()).map((member) => member.id)).toEqual(["bilal", "arshad", "karim"]);
  });
});
