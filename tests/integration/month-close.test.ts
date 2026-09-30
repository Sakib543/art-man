import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { GET as staffSlip } from "@/app/api/staff-slip/route";
import { db } from "@/db";
import { cancelBill } from "@/db/bill-cancel";
import { checkDayCodes } from "@/db/day-code";
import { getMonthlyReport } from "@/db/queries/month-report";
import { auditLog, billLines, bills, khataEntries, monthAdjustments, monthCloses } from "@/db/schema";
import { startNextDay } from "@/features/day-close/service";
import { editBillRow } from "@/features/developer/service";
import { entrySchema } from "@/features/folders/schemas";
import { addEntry } from "@/features/folders/service";
import { cancelAdjustment, recordAdjustment } from "@/features/month-adjustments/service";
import { closeMonth } from "@/features/month-close/service";
import { addOther } from "@/features/monthly-expenses/service";
import { saveSharesAction } from "@/features/partners/actions";
import { getPartnersData } from "@/features/partners/queries";
import { getSlipData } from "@/features/staff-khata/queries";
import { buildSlip } from "@/features/staff-khata/slip";
import type { ClosedShare, MonthReport } from "@/lib/accounting";
import { NextRequest } from "next/server";
import { asRequest } from "./request";
import { closeToday, ringUp, seedSalon, signIn, warmPool, type Salon } from "./salon";

/**
 * The month's end: partners' shares that must add up (P7.4, QA-06), a month
 * closed only once its last day is (P3.4), the salaries it posts, a closed
 * month frozen and corrected in the next (P3.4), a developer's change in it
 * worked out again (P1.10), and the salary slip (P3.3).
 */
let salon: Salon;

beforeAll(async () => {
  salon = await seedSalon({
    staff: [
      { name: "Arshad", payType: 3, dailyWage: 0, commissionRate: 10 },
      { name: "Salim", payType: 1, salary: 30_000 },
    ],
    partners: [
      { name: "Partner A", sharePct: 100 },
      { name: "Partner B", sharePct: 0 },
      { name: "Partner C", sharePct: 0 },
    ],
    firstDay: { date: "2026-09-29", openingCash: 5_000 },
  });
});

const septemberClose = async () => (await db.select().from(monthCloses))[0];

describe("partners' shares (P7.4)", () => {
  it("refuses a third decimal at the Save", async () => {
    await signIn(salon.owner);
    const result = await saveSharesAction({
      partners: [
        { id: salon.partners["Partner A"], name: "Partner A", sharePct: 33.333 },
        { id: salon.partners["Partner B"], name: "Partner B", sharePct: 33.333 },
        { id: salon.partners["Partner C"], name: "Partner C", sharePct: 33.334 },
      ],
    });
    expect(result).toEqual({ ok: false, error: "Use at most two decimals in a share, e.g. 33.33" });
  });

  it("takes shares whose floats do not add up to 100 exactly, and the Partners page still renders", async () => {
    await signIn(salon.owner);
    const result = await saveSharesAction({
      partners: [
        { id: salon.partners["Partner A"], name: "Partner A", sharePct: 0.01 },
        { id: salon.partners["Partner B"], name: "Partner B", sharePct: 65.4 },
        { id: salon.partners["Partner C"], name: "Partner C", sharePct: 34.59 },
      ],
    });
    expect(result).toEqual({ ok: true, data: null });

    const page = await getPartnersData("2026-09");
    expect(page?.partners.map((partner) => partner.sharePct)).toEqual([0.01, 65.4, 34.59]);
  });
});

describe("closing September", () => {
  it("is refused until its last day is closed", async () => {
    await ringUp(salon.manager, [{ serviceId: salon.services.Haircut, staffId: salon.staff.Arshad }], { cash: 500 });
    await ringUp(salon.manager, [{ serviceId: salon.services.Facial, staffId: salon.staff.Arshad }], { online: 1_250 });
    await addEntry(salon.manager, entrySchema.parse({ kind: "expense", amount: 200, description: "Towels", paidFrom: "drawer" }));
    await closeToday(salon.manager);

    await expect(closeMonth(salon.owner, "2026-09")).rejects.toThrow("September 2026 is not over yet");

    await startNextDay(salon.manager);
    await ringUp(salon.manager, [{ serviceId: salon.services.Shave, staffId: salon.staff.Arshad }], { cash: 250 });
    await expect(closeMonth(salon.owner, "2026-09")).rejects.toThrow("Close the open business day");
    await closeToday(salon.manager);
  });

  it("saves the report and the shares, which add up to the net profit, and posts the salaries", async () => {
    await closeMonth(salon.owner, "2026-09");

    const closed = await septemberClose();
    const report = closed.report as MonthReport;
    const shares = closed.shares as ClosedShare[];
    // 2,000 of sales − 200 of towels − 200 of commission − 30,000 of salary.
    expect(report.netProfit).toBe(-28_400);
    expect(shares.map((share) => share.sharePct)).toEqual([0.01, 65.4, 34.59]);
    expect(shares.reduce((sum, share) => sum + share.amount, 0)).toBe(report.netProfit);
    expect(shares.every((share) => Number.isInteger(share.amount))).toBe(true);

    const [salary] = await db
      .select()
      .from(khataEntries)
      .where(and(eq(khataEntries.staffId, salon.staff.Salim), eq(khataEntries.kind, "earning")));
    expect(salary).toMatchObject({ businessDate: "2026-09-30", label: "Monthly salary (September 2026)", amount: 30_000 });

    const page = await getPartnersData("2026-09");
    expect(page?.closed).toBe(true);
  });

  it("is closed once", async () => {
    await expect(closeMonth(salon.owner, "2026-09")).rejects.toThrow("September 2026 is already closed.");
  });

  it("freezes the month: its bills and expenses can no longer change", async () => {
    await startNextDay(salon.manager);
    const [bill] = await db.select().from(bills).where(eq(bills.businessDate, "2026-09-29")).limit(1);

    await expect(cancelBill(salon.owner, bill.id, "Too late")).rejects.toThrow(/closed/i);
    await expect(
      addOther(salon.owner, { month: "2026-09", reason: "Late invoice", amount: 500, paidFrom: "drawer", clientId: null }),
    ).rejects.toThrow("This month is closed and frozen");
  });
});

describe("an adjustment for the closed month (P3.4)", () => {
  it("counts in October, and is cancelled once however many cancels arrive", async () => {
    await recordAdjustment(salon.owner, {
      correctsMonth: "2026-09",
      kind: "sale",
      direction: "more",
      amount: 1_000,
      online: false,
      paidFrom: "drawer",
      reason: "A bill written on paper and never entered",
      clientId: null,
    });
    const [adjustment] = await db.select().from(monthAdjustments);
    expect(adjustment).toMatchObject({ month: "2026-10-01", correctsMonth: "2026-09-01", amount: 1_000 });
    expect((await getMonthlyReport("2026-10"))?.report.adjustments).toBe(1_000);
    expect(((await septemberClose()).report as MonthReport).netProfit).toBe(-28_400);

    await warmPool();
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => cancelAdjustment(salon.owner, { adjustmentId: adjustment.id, reason: "Entered twice" })),
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await db.select().from(monthAdjustments).where(eq(monthAdjustments.voidsId, adjustment.id))).toHaveLength(1);
    expect((await getMonthlyReport("2026-10"))?.report.adjustments).toBe(0);
  });
});

describe("a developer's change to a bill in the closed month (P1.10)", () => {
  it("works the month's report and shares out again, keeps the salaries, and every day's code still checks out", async () => {
    const before = await septemberClose();
    const [bill] = await db.select().from(bills).where(eq(bills.businessDate, "2026-09-30"));
    const [line] = await db.select().from(billLines).where(eq(billLines.billId, bill.id));

    // The Shave was Salim's, who earns no commission: Arshad's Rs 25 comes off.
    await editBillRow(salon.developer, {
      billNo: bill.billNo,
      lines: [{ id: line.id, name: line.name, amount: line.amount, staffId: salon.staff.Salim }],
      cash: bill.cash,
      online: bill.online,
      bookNo: null,
      reason: "Wrong karigar",
    });

    const after = await septemberClose();
    const report = after.report as MonthReport;
    expect(report.netProfit).toBe((before.report as MonthReport).netProfit + 25);
    expect(report.salaries).toBe(30_000);
    expect((after.shares as ClosedShare[]).reduce((sum, share) => sum + share.amount, 0)).toBe(report.netProfit);
    expect(await db.select().from(auditLog).where(eq(auditLog.action, "month.recalculate"))).toHaveLength(1);
    expect(await checkDayCodes("2026-09-29", "2026-09-30")).toEqual([
      expect.objectContaining({ ok: true }),
      expect.objectContaining({ ok: true }),
    ]);
  });
});

describe("the salary slip (P3.3)", () => {
  const slipUrl = () => `http://localhost:3000/api/staff-slip?staff=${salon.staff.Salim}&month=2026-09`;

  it("is a PDF for any signed-in role, and adds up to the khata", async () => {
    await signIn(salon.manager);
    const response = await staffSlip(new NextRequest(slipUrl()));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");

    const data = await getSlipData(salon.staff.Salim, "2026-09");
    const slip = buildSlip("2026-09", data!.lines);
    expect(slip.totals).toMatchObject({ salary: 30_000, commission: 0, earned: 30_000 });
    expect(slip.closingBalance).toBe(30_000);
  });

  it("is refused signed out", async () => {
    asRequest(null);
    expect((await staffSlip(new NextRequest(slipUrl()))).status).toBe(401);
  });
});
