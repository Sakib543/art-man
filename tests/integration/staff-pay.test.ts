import { and, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { cancelBill } from "@/db/bill-cancel";
import { checkDayCodes } from "@/db/day-code";
import { getMonthlyReport } from "@/db/queries/month-report";
import { attendance, billLines, bills, daySnapshots, khataEntries, staff } from "@/db/schema";
import { startNextDay } from "@/features/day-close/service";
import { getCloseState } from "@/features/month-close/queries";
import { closeMonth } from "@/features/month-close/service";
import { getSlipData } from "@/features/staff-khata/queries";
import { buildSlip } from "@/features/staff-khata/slip";
import { saveStaffAction } from "@/features/staff-rates/actions";
import type { MonthReport } from "@/lib/accounting";
import { closeToday, ringUp, seedSalon, signIn, type Salon } from "./salon";

/**
 * Staff pay in parts (backlog P3.17), through a month on a real database: the
 * client's karigar on a salary plus Rs 200 for each day present, salary + 10%,
 * commission only, all three, and a daily wage alone — saved from the Staff &
 * rates form's action, paid at Day close, settled again after a correction on
 * the day's own terms, and paid their salaries at Month close.
 */
let salon: Salon;
const id: Record<string, string> = {};

const PEOPLE = [
  // The client's case (2026-10-02): a fixed salary, and Rs 200 for each day present.
  { name: "Bilal", payType: 5, salary: 25_000, dailyWage: 200, commissionRate: 0 },
  { name: "Hamid", payType: 2, salary: 20_000, dailyWage: 0, commissionRate: 10 },
  { name: "Ali", payType: 4, salary: 0, dailyWage: 0, commissionRate: 10 },
  { name: "Nadeem", payType: 6, salary: 15_000, dailyWage: 200, commissionRate: 5 },
  { name: "Sadiq", payType: 7, salary: 0, dailyWage: 600, commissionRate: 0 },
] as const;

/** A staff member's khata lines on one day, label and amount. */
async function linesOn(name: string, businessDate: string) {
  const rows = await db
    .select({ kind: khataEntries.kind, label: khataEntries.label, amount: khataEntries.amount })
    .from(khataEntries)
    .where(and(eq(khataEntries.staffId, id[name]), eq(khataEntries.businessDate, businessDate)));
  return rows;
}

const net = (rows: { amount: number }[]) => rows.reduce((sum, row) => sum + row.amount, 0);

beforeAll(async () => {
  salon = await seedSalon({ staff: [], firstDay: { date: "2026-09-29", openingCash: 5_000 } });
  await signIn(salon.owner);
  for (const person of PEOPLE) {
    expect(await saveStaffAction({ ...person, active: true }), person.name).toEqual({ ok: true, data: null });
    const [row] = await db.select({ id: staff.id }).from(staff).where(eq(staff.name, person.name));
    id[person.name] = row.id;
  }
});

describe("the Staff & rates form's save", () => {
  it("keeps each pay type as chosen, the parts it does not use at 0", async () => {
    const rows = await db.select().from(staff);
    const byName = Object.fromEntries(rows.map((row) => [row.name, row]));
    for (const person of PEOPLE) {
      expect(byName[person.name]).toMatchObject({
        payType: person.payType,
        salary: person.salary,
        dailyWage: person.dailyWage,
        commissionRate: person.commissionRate,
      });
    }
  });

  it("refuses a chosen part with no amount, and a pay type the database does not know", async () => {
    expect(await saveStaffAction({ name: "Zero", payType: 5, salary: 25_000, dailyWage: 0, commissionRate: 0, active: true })).toEqual({
      ok: false,
      error: "Enter the daily wage",
    });
    expect(await saveStaffAction({ name: "Eight", payType: 8, salary: 1, dailyWage: 1, commissionRate: 1, active: true })).toEqual({
      ok: false,
      error: "Choose how this person is paid",
    });
    await expect(db.execute(sql`update staff set pay_type = 8 where name = 'Bilal'`)).rejects.toThrow();
  });
});

describe("a month on every kind of pay", () => {
  it("closes a day: commission on each one's own work, the daily wage for those present", async () => {
    await ringUp(salon.manager, [{ serviceId: salon.services.Haircut, staffId: id.Hamid }], { cash: 500 });
    await ringUp(salon.manager, [{ serviceId: salon.services.Facial, staffId: id.Ali }], { cash: 1_250 });
    await ringUp(salon.manager, [{ serviceId: salon.services.Shave, staffId: id.Nadeem }], { cash: 250 });
    await ringUp(salon.manager, [{ serviceId: salon.services.Haircut, staffId: id.Bilal }], { cash: 500 });
    await closeToday(salon.manager, { attendance: { [id.Sadiq]: false } });

    // Bilal's work earns him nothing more: his pay has no commission.
    expect(await linesOn("Bilal", "2026-09-29")).toEqual([{ kind: "earning", label: "Daily wage", amount: 200 }]);
    expect(await linesOn("Hamid", "2026-09-29")).toEqual([{ kind: "earning", label: "Commission (on work of 500)", amount: 50 }]);
    expect(await linesOn("Ali", "2026-09-29")).toEqual([{ kind: "earning", label: "Commission (on work of 1250)", amount: 125 }]);
    // 5% of 250 is 12.5, rounded half up (commissionOn).
    expect(await linesOn("Nadeem", "2026-09-29")).toEqual(
      expect.arrayContaining([
        { kind: "earning", label: "Commission (on work of 250)", amount: 13 },
        { kind: "earning", label: "Daily wage", amount: 200 },
      ]),
    );
    expect(await linesOn("Sadiq", "2026-09-29")).toEqual([]);

    const [snapshot] = await db.select().from(daySnapshots).where(eq(daySnapshots.businessDate, "2026-09-29"));
    expect(snapshot).toMatchObject({ sale: 2_500, staffEarned: 200 + 50 + 125 + 213, dayProfit: 2_500 - 588 });

    // The day's list keeps each one's pay as it closed (P7.3), the new types included.
    const marked = await db.select().from(attendance).where(eq(attendance.businessDate, "2026-09-29"));
    expect(Object.fromEntries(marked.map((row) => [row.staffId, [row.payType, row.dailyWage, row.present]]))).toEqual({
      [id.Bilal]: [5, 200, true],
      [id.Hamid]: [2, 0, true],
      [id.Ali]: [4, 0, true],
      [id.Nadeem]: [6, 200, true],
      [id.Sadiq]: [7, 600, false],
    });
  });

  it("settles a corrected closed day on that day's own pay, not on a raise since", async () => {
    await startNextDay(salon.manager);
    // Bilal's daily wage goes up after the 29th closed: that day stays at 200.
    await signIn(salon.owner);
    expect(await saveStaffAction({ ...PEOPLE[0], id: id.Bilal, dailyWage: 300, active: true })).toEqual({ ok: true, data: null });
    expect(await db.select({ id: staff.id }).from(staff).where(eq(staff.name, "Bilal"))).toHaveLength(1);

    const [shave] = await db
      .select({ id: bills.id })
      .from(bills)
      .innerJoin(billLines, eq(billLines.billId, bills.id))
      .where(and(eq(bills.businessDate, "2026-09-29"), eq(billLines.staffId, id.Nadeem)));
    await cancelBill(salon.owner, shave.id, "Wrong customer");

    // Nadeem loses the commission and keeps the day's wage; nobody else moves.
    expect(net(await linesOn("Nadeem", "2026-09-29"))).toBe(200);
    expect(net(await linesOn("Bilal", "2026-09-29"))).toBe(200);
    expect(net(await linesOn("Hamid", "2026-09-29"))).toBe(50);
    expect(net(await linesOn("Ali", "2026-09-29"))).toBe(125);
    expect(net(await linesOn("Sadiq", "2026-09-29"))).toBe(0);

    const [snapshot] = await db.select().from(daySnapshots).where(eq(daySnapshots.businessDate, "2026-09-29"));
    expect(snapshot).toMatchObject({ staffEarned: 575, dayProfit: 2_500 - 250 - 575 });
  });

  it("closes the month's last day on the pay now: Bilal absent, Sadiq present", async () => {
    await ringUp(salon.manager, [{ serviceId: salon.services.Haircut, staffId: id.Ali }], { cash: 500 });
    await closeToday(salon.manager, { attendance: { [id.Bilal]: false }, payouts: { [id.Ali]: 50 } });

    expect(await linesOn("Bilal", "2026-09-30")).toEqual([]);
    expect(net(await linesOn("Ali", "2026-09-30"))).toBe(50 - 50);
    expect(await linesOn("Sadiq", "2026-09-30")).toEqual([{ kind: "earning", label: "Daily wage", amount: 600 }]);
    expect(await linesOn("Nadeem", "2026-09-30")).toEqual([{ kind: "earning", label: "Daily wage", amount: 200 }]);
    expect(await linesOn("Hamid", "2026-09-30")).toEqual([]);
  });

  it("counts the salaries of every pay with one, the same before and at Month close", async () => {
    const state = await getCloseState("2026-09");
    expect(Object.fromEntries(state.salaries.map((line) => [line.name, line.salary]))).toEqual({
      Bilal: 25_000,
      Hamid: 20_000,
      Nadeem: 15_000,
    });
    const before = await getMonthlyReport("2026-09");
    expect(before?.live.salaries).toBe(60_000);

    await closeMonth(salon.owner, "2026-09");

    const after = await getMonthlyReport("2026-09");
    const report = after?.report as MonthReport;
    expect(report.salaries).toBe(60_000);
    // Sales 2,750 (the shave cancelled) − staff earned on the days (575 + 850) − salaries.
    expect(report.netProfit).toBe(2_750 - 575 - 850 - 60_000);

    const salaryLines = await db
      .select({ staffId: khataEntries.staffId, amount: khataEntries.amount })
      .from(khataEntries)
      .where(eq(khataEntries.label, "Monthly salary (September 2026)"));
    expect(Object.fromEntries(salaryLines.map((line) => [line.staffId, line.amount]))).toEqual({
      [id.Bilal]: 25_000,
      [id.Hamid]: 20_000,
      [id.Nadeem]: 15_000,
    });
  });

  it("gives each one's slip the month as the khata has it", async () => {
    const slipOf = async (name: string) => buildSlip("2026-09", (await getSlipData(id[name], "2026-09"))!.lines);

    // The client's karigar: one day present at Rs 200, and the month's salary.
    expect((await slipOf("Bilal")).totals).toMatchObject({ wage: 200, commission: 0, salary: 25_000, earned: 25_200 });
    expect((await slipOf("Bilal")).wageDays).toBe(1);
    expect((await slipOf("Hamid")).totals).toMatchObject({ commission: 50, salary: 20_000, earned: 20_050 });
    expect((await slipOf("Ali")).totals).toMatchObject({ commission: 175, wage: 0, salary: 0, earned: 175 });
    expect((await slipOf("Ali")).closingBalance).toBe(125);
    expect((await slipOf("Nadeem")).totals).toMatchObject({ wage: 400, salary: 15_000 });
    expect((await slipOf("Sadiq")).totals).toMatchObject({ wage: 600, commission: 0, salary: 0, earned: 600 });
  });

  it("leaves every closed day's security code checking out", async () => {
    expect(await checkDayCodes("2026-09-29", "2026-09-30")).toEqual([
      expect.objectContaining({ ok: true }),
      expect.objectContaining({ ok: true }),
    ]);
  });
});
