import { and, eq, like } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { getMonthlyReport } from "@/db/queries/month-report";
import { auditLog, khataEntries, staff } from "@/db/schema";
import { reopenDay, startNextDay } from "@/features/day-close/service";
import { closeMonth } from "@/features/month-close/service";
import { getSlipData } from "@/features/staff-khata/queries";
import { buildSlip } from "@/features/staff-khata/slip";
import { previewLeaverAction, saveStaffAction } from "@/features/staff-rates/actions";
import type { MonthReport } from "@/lib/accounting";
import { closeToday, seedSalon, signIn, warmPool, type Salon } from "./salon";

/**
 * A karigar on a salary who leaves mid-month (backlog P3.19, QA-11): paid the
 * month's salary for the days present, from the attendance Day close kept,
 * when the Owner makes them inactive — once, however many Saves arrive —
 * taken back if they are made active again, left alone by a reopen, counted
 * in the month's salaries, and never paid again by Month close.
 *
 * Bilal earns 31,000, so each day of October is 1,000.
 */
let salon: Salon;

const form = async (name: string) => {
  const [row] = await db.select().from(staff).where(eq(staff.name, name));
  return {
    id: row.id,
    name: row.name,
    payType: row.payType,
    salary: row.salary,
    dailyWage: row.dailyWage,
    commissionRate: row.commissionRate,
    overtimeRate: row.overtimeRate,
    active: row.active,
  };
};

/** Every khata line of Bilal's, whatever wrote it: a reopen's reversal included. */
const bilalBalance = async () =>
  (await db.select().from(khataEntries).where(eq(khataEntries.staffId, salon.staff.Bilal))).reduce((sum, line) => sum + line.amount, 0);

const salaryLines = (name: "Bilal" | "Hamid") =>
  db
    .select()
    .from(khataEntries)
    .where(and(eq(khataEntries.staffId, salon.staff[name]), like(khataEntries.label, "Monthly salary%")));

beforeAll(async () => {
  salon = await seedSalon({
    staff: [
      { name: "Bilal", payType: 1, salary: 31_000 },
      { name: "Hamid", payType: 2, salary: 20_000, commissionRate: 10 },
      { name: "Sadiq", payType: 3, dailyWage: 700 },
    ],
    firstDay: { date: "2026-10-27", openingCash: 5_000 },
  });
  // 27 Oct present, 28 Oct away, 29 Oct present — and the 29th the latest closed day.
  await closeToday(salon.manager);
  await startNextDay(salon.manager);
  await closeToday(salon.manager, { attendance: { [salon.staff.Bilal]: false } });
  await startNextDay(salon.manager);
  await closeToday(salon.manager);
});

describe("making Bilal inactive", () => {
  it("is previewed with the sum the Save will post", async () => {
    await signIn(salon.owner);
    expect(await previewLeaverAction({ staffId: salon.staff.Bilal, lastDay: "2026-10-29" })).toEqual({
      ok: true,
      data: { salary: 31_000, settlement: { kind: "pay", month: "2026-10", daysPresent: 2, daysInMonth: 31, amount: 2_000 } },
    });
  });

  it("refuses a last day not closed yet, and no last day at all", async () => {
    await signIn(salon.owner);
    const preview = await previewLeaverAction({ staffId: salon.staff.Bilal, lastDay: "2026-10-30" });
    expect(preview).toMatchObject({ ok: true, data: { settlement: { kind: "refuse" } } });

    const bilal = await form("Bilal");
    expect(await saveStaffAction({ ...bilal, active: false })).toEqual({ ok: false, error: "Choose their last working day." });
    expect(await saveStaffAction({ ...bilal, active: false, lastDay: "2026-10-30" })).toEqual({
      ok: false,
      error: "Choose a day that is already closed: 29 Oct or before. If they worked today, close the day first.",
    });
    expect((await form("Bilal")).active).toBe(true);
  });

  it("posts the salary for the days present, once, however many Saves arrive", async () => {
    await signIn(salon.owner);
    const bilal = await form("Bilal");
    await warmPool();
    const results = await Promise.all(Array.from({ length: 3 }, () => saveStaffAction({ ...bilal, active: false, lastDay: "2026-10-29" })));
    expect(results).toEqual(Array.from({ length: 3 }, () => ({ ok: true, data: null })));

    const lines = await salaryLines("Bilal");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      businessDate: "2026-10-29",
      kind: "earning",
      amount: 2_000,
      label: "Monthly salary (October 2026): 2 of 31 days present, last day 29 Oct",
    });
    const audits = await db.select().from(auditLog).where(eq(auditLog.action, "staff.update"));
    expect(audits.filter((row) => (row.after as { leaverSalary?: unknown }).leaverSalary)).toHaveLength(1);
  });

  it("is counted in the month's salaries beside the staff still active", async () => {
    expect((await getMonthlyReport("2026-10"))!.live.salaries).toBe(20_000 + 2_000);
  });

  it("is left alone when its day is reopened and closed again", async () => {
    const [line] = await salaryLines("Bilal");
    await reopenDay(salon.owner, "Recount");
    await closeToday(salon.manager);
    // A reopen reverses what the day's close wrote; a salary is not the close's.
    expect(await db.select().from(khataEntries).where(eq(khataEntries.reversesEntryId, line.id))).toEqual([]);
    expect(await bilalBalance()).toBe(2_000);
  });

  it("is taken back when they are made active again, and posted again when they leave again", async () => {
    await signIn(salon.owner);
    expect(await saveStaffAction({ ...(await form("Bilal")), active: true })).toEqual({ ok: true, data: null });
    const back = await salaryLines("Bilal");
    expect(back.map((line) => line.amount).sort((a, b) => a - b)).toEqual([-2_000, 2_000]);
    expect(back.find((line) => line.amount < 0)).toMatchObject({
      label: "Monthly salary (October 2026): taken back, active again",
      reversesEntryId: back.find((line) => line.amount > 0)!.id,
    });
    expect(await bilalBalance()).toBe(0);
    // Active again: Month close would pay him the month in full, so the report counts 31,000 for him.
    expect((await getMonthlyReport("2026-10"))!.live.salaries).toBe(20_000 + 31_000);

    // Leaving again on the 29th counts the attendance as it stands now: the
    // 29th was reopened while he was inactive and closed again without him on
    // its list, so only the 27th is a day present — 1,000. The preview says so.
    expect(await previewLeaverAction({ staffId: salon.staff.Bilal, lastDay: "2026-10-29" })).toMatchObject({
      data: { settlement: { daysPresent: 1, amount: 1_000 } },
    });
    expect(await saveStaffAction({ ...(await form("Bilal")), active: false, lastDay: "2026-10-29" })).toEqual({ ok: true, data: null });
    expect(await bilalBalance()).toBe(1_000);
    expect((await getMonthlyReport("2026-10"))!.live.salaries).toBe(20_000 + 1_000);
  });

  it("asks nothing of someone with no salary", async () => {
    await signIn(salon.owner);
    expect(await saveStaffAction({ ...(await form("Sadiq")), active: false })).toEqual({ ok: true, data: null });
    expect(await saveStaffAction({ ...(await form("Sadiq")), active: true })).toEqual({ ok: true, data: null });
  });
});

describe("the month", () => {
  it("refuses a leaver whose last day is after a month still open", async () => {
    await startNextDay(salon.manager);
    await closeToday(salon.manager);
    await startNextDay(salon.manager);
    await closeToday(salon.manager);
    // 1 November is closed, October is not.
    await startNextDay(salon.manager);
    await closeToday(salon.manager);
    await signIn(salon.owner);
    expect(await saveStaffAction({ ...(await form("Hamid")), active: false, lastDay: "2026-11-01" })).toEqual({
      ok: false,
      error: "Close October 2026 first: their salary for it is added when it closes.",
    });
  });

  it("closes with the leaver's salary counted once and Month close paying only those active", async () => {
    await closeMonth(salon.owner, "2026-10");
    const report = (await getMonthlyReport("2026-10"))!.report as MonthReport;
    expect(report.salaries).toBe(21_000);

    expect(await salaryLines("Hamid")).toEqual([expect.objectContaining({ label: "Monthly salary (October 2026)", amount: 20_000 })]);
    // Nothing more for Bilal: his October was paid when he left.
    expect(await bilalBalance()).toBe(1_000);
    const slip = buildSlip("2026-10", (await getSlipData(salon.staff.Bilal, "2026-10"))!.lines);
    expect(slip.totals).toMatchObject({ salary: 1_000, earned: 1_000 });
  });

  it("adds nothing for a last day in a month closed with the full salary", async () => {
    await signIn(salon.owner);
    expect(await previewLeaverAction({ staffId: salon.staff.Hamid, lastDay: "2026-10-31" })).toMatchObject({
      ok: true,
      data: { settlement: { kind: "none", note: "October 2026 was closed with their full salary, so nothing more is added." } },
    });
    expect(await saveStaffAction({ ...(await form("Hamid")), active: false, lastDay: "2026-10-31" })).toEqual({ ok: true, data: null });
    expect(await salaryLines("Hamid")).toHaveLength(1);
  });
});
