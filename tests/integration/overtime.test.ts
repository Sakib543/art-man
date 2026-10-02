import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { getMonthlyReport } from "@/db/queries/month-report";
import { auditLog, khataEntries, staff } from "@/db/schema";
import { startNextDay } from "@/features/day-close/service";
import { closeMonth } from "@/features/month-close/service";
import { addDeductionAction, addOvertimeAction, cancelKhataLineAction } from "@/features/staff-khata/actions";
import { getKhataData, getSlipData } from "@/features/staff-khata/queries";
import { buildSlip } from "@/features/staff-khata/slip";
import { saveStaffAction } from "@/features/staff-rates/actions";
import type { MonthReport } from "@/lib/accounting";
import { closeToday, seedSalon, signIn, warmPool, type Salon } from "./salon";

/**
 * Overtime and deductions (backlog P3.18) on a real database: the Manager adds
 * them, the rupees come from the karigar's rate on the server, a Save sent
 * twice saves once, the Owner cancels a wrong one — once, however many
 * cancels arrive at the same moment — and the month's profit and the salary
 * slip count what is left.
 */
let salon: Salon;

const lines = (kind: "overtime" | "deduction") =>
  db
    .select()
    .from(khataEntries)
    .where(and(eq(khataEntries.staffId, salon.staff.Hamid), eq(khataEntries.kind, kind)));

beforeAll(async () => {
  salon = await seedSalon({
    staff: [
      { name: "Hamid", payType: 2, salary: 20_000, commissionRate: 10, overtimeRate: 150 },
      { name: "Bilal", payType: 3, dailyWage: 700, commissionRate: 10 },
    ],
    firstDay: { date: "2026-09-29", openingCash: 5_000 },
  });
});

describe("overtime", () => {
  it("is the hours at the karigar's rate, worked out on the server, added by the Manager", async () => {
    await signIn(salon.manager);
    const clientId = crypto.randomUUID();
    // An amount slipped in beside the hours is not read.
    const sent = { staffId: salon.staff.Hamid, hours: 3, reason: "Wedding party", amount: 99_999, clientId };
    expect(await addOvertimeAction(sent)).toEqual({ ok: true, data: null });
    // The same Save again: a double press, or a retry after a lost answer.
    expect(await addOvertimeAction(sent)).toEqual({ ok: true, data: null });

    const saved = await lines("overtime");
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ businessDate: "2026-09-29", amount: 450, label: "Overtime 3 h × Rs 150: Wedding party" });
    const [audit] = await db.select().from(auditLog).where(eq(auditLog.action, "khata.overtime"));
    expect(audit).toMatchObject({ actor: "manager", target: "Hamid" });
    expect(audit.after).toMatchObject({ hours: 3, rate: 150, amount: 450 });
  });

  it("rounds from exact hundredths of an hour", async () => {
    await signIn(salon.manager);
    // 1.13 h × 150 is 169.5 → 170; as floats it would have been 169.
    const result = await addOvertimeAction({ staffId: salon.staff.Hamid, hours: 1.13, reason: "Wrong day", clientId: crypto.randomUUID() });
    expect(result).toEqual({ ok: true, data: null });
    expect((await lines("overtime")).map((line) => line.amount).sort()).toEqual([170, 450]);
  });

  it("is refused for a karigar with no rate set", async () => {
    await signIn(salon.manager);
    expect(await addOvertimeAction({ staffId: salon.staff.Bilal, hours: 2, reason: "Late night", clientId: null })).toEqual({
      ok: false,
      error: "No overtime rate is set for them. The Owner sets it on Staff & rates.",
    });
  });

  it("keeps a karigar's rate when a form from before P3.18 saves them without one", async () => {
    await signIn(salon.owner);
    const [hamid] = await db.select().from(staff).where(eq(staff.id, salon.staff.Hamid));
    // The form's fields as they were before P3.18: no overtime rate among them.
    const asBefore = {
      id: hamid.id,
      name: hamid.name,
      payType: hamid.payType,
      salary: hamid.salary,
      dailyWage: hamid.dailyWage,
      commissionRate: hamid.commissionRate,
      active: hamid.active,
    };
    expect(await saveStaffAction({ ...asBefore, salary: 21_000 })).toEqual({ ok: true, data: null });
    const [after] = await db.select().from(staff).where(eq(staff.id, salon.staff.Hamid));
    expect(after).toMatchObject({ salary: 21_000, overtimeRate: 150 });
    // Put back for the month's salary below.
    expect(await saveStaffAction({ ...asBefore })).toEqual({ ok: true, data: null });
  });
});

describe("a deduction", () => {
  it("is rupees taken off the khata, by the Manager, with a reason", async () => {
    await signIn(salon.manager);
    expect(await addDeductionAction({ staffId: salon.staff.Hamid, amount: 300, reason: "Came two hours late", clientId: null })).toEqual({
      ok: true,
      data: null,
    });
    const [line] = await lines("deduction");
    expect(line).toMatchObject({ amount: -300, label: "Deduction: Came two hours late" });
  });
});

describe("the Owner cancels a wrong one", () => {
  it("once, however many cancels arrive at the same moment", async () => {
    await signIn(salon.owner);
    const wrong = (await lines("overtime")).find((line) => line.amount === 170)!;
    await warmPool();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => cancelKhataLineAction({ entryId: wrong.id, reason: "Entered for the wrong day" })),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual(
      Array.from({ length: 4 }, () => ({ ok: false, error: "This line has already been cancelled." })),
    );

    const cancellation = (await lines("overtime")).find((line) => line.reversesEntryId === wrong.id)!;
    // The same kind and date, sign turned: the month's overtime nets to 450.
    expect(cancellation).toMatchObject({ amount: -170, businessDate: wrong.businessDate, label: "Cancelled: Overtime 1.13 h × Rs 150: Wrong day (Entered for the wrong day)" });
  });

  it("never a cancellation, nor any other kind of line", async () => {
    await signIn(salon.owner);
    const cancellation = (await lines("overtime")).find((line) => line.reversesEntryId !== null)!;
    expect(await cancelKhataLineAction({ entryId: cancellation.id, reason: "Undo the undo" })).toEqual({
      ok: false,
      error: "Only overtime and deductions can be cancelled here.",
    });
  });

  it("shows the Cancel only on what is still standing", async () => {
    const data = await getKhataData(salon.staff.Hamid, "2026-09");
    const flags = Object.fromEntries(data!.ledger.map((row) => [row.label, row.cancellable]));
    expect(flags).toEqual({
      "Overtime 3 h × Rs 150: Wedding party": true,
      "Overtime 1.13 h × Rs 150: Wrong day": false,
      "Cancelled: Overtime 1.13 h × Rs 150: Wrong day (Entered for the wrong day)": false,
      "Deduction: Came two hours late": true,
    });
  });
});

describe("the month", () => {
  it("counts overtime as staff cost and a deduction against it, and freezes them at close", async () => {
    // Bilal away both days, so his daily wage stays out of the month.
    const away = { attendance: { [salon.staff.Bilal]: false } };
    await closeToday(salon.manager, away);
    await startNextDay(salon.manager);
    await closeToday(salon.manager, away);

    const live = (await getMonthlyReport("2026-09"))!.live;
    expect(live).toMatchObject({ overtime: 450, deductions: 300, bonuses: 0, salaries: 20_000 });
    // No sales: the salary, the overtime and the deduction are the whole month.
    expect(live.netProfit).toBe(-20_000 - 450 + 300);

    await closeMonth(salon.owner, "2026-09");
    const closed = (await getMonthlyReport("2026-09"))!.report as MonthReport;
    expect(closed).toMatchObject({ overtime: 450, deductions: 300, netProfit: -20_150 });
  });

  it("refuses overtime, a deduction and a cancel once the month is closed", async () => {
    await signIn(salon.manager);
    expect(await addOvertimeAction({ staffId: salon.staff.Hamid, hours: 1, reason: "After close", clientId: null })).toEqual({
      ok: false,
      error: "This month is closed. Add the overtime in the next month.",
    });
    expect(await addDeductionAction({ staffId: salon.staff.Hamid, amount: 100, reason: "After close", clientId: null })).toEqual({
      ok: false,
      error: "This month is closed. Take the deduction off in the next month.",
    });
    await signIn(salon.owner);
    const [deduction] = await lines("deduction");
    expect(await cancelKhataLineAction({ entryId: deduction.id, reason: "Too late" })).toEqual({
      ok: false,
      error: "Its month is closed. Put it right with an adjustment, from the Monthly report.",
    });
    const data = await getKhataData(salon.staff.Hamid, "2026-09");
    expect(data!.ledger.some((row) => row.cancellable)).toBe(false);
  });

  it("puts them on the salary slip, which adds up to the khata", async () => {
    const data = await getSlipData(salon.staff.Hamid, "2026-09");
    const slip = buildSlip("2026-09", data!.lines);
    expect(slip.totals).toMatchObject({ overtime: 450, deductions: 300, salary: 20_000, earned: 20_150 });
    expect(slip.closingBalance).toBe(20_150);
  });
});
