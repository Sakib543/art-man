import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildSlip, type SlipLine } from "./slip";
import { pdfSafe, renderSlipPdf, statusNote, summaryRows, type SlipInfo } from "./slip-pdf";

let next = 0;
const line = (businessDate: string, kind: SlipLine["kind"], label: string, amount: number): SlipLine => ({
  id: `l${++next}`,
  businessDate,
  kind,
  label,
  amount,
  reversesEntryId: null,
  cashEntryId: kind === "payment" || kind === "advance" ? `c${next}` : null,
});

const info: SlipInfo = {
  salonName: "Art Men's Salon",
  staffName: "Sherry",
  payType: "Daily wage + commission (10%)",
  monthLabel: "September 2026",
  previousMonthLabel: "August 2026",
  closedOn: "1 Oct 2026",
  work: 4000,
  paysCommission: true,
  paysWage: true,
  paysSalary: false,
  generatedAt: "2 Oct 2026, 10:15",
};

const slip = buildSlip("2026-09", [
  line("2026-08-31", "earning", "Daily wage", 800),
  line("2026-09-01", "earning", "Daily wage", 800),
  line("2026-09-01", "earning", "Commission (on work of 4000)", 400),
  line("2026-09-02", "payment", "Payment", -1500),
  line("2026-09-03", "advance", "Advance", -500),
]);

describe("summaryRows (backlog P3.3)", () => {
  it("reads top to bottom: brought forward, earned, taken, and what is left", () => {
    expect(summaryRows(slip, info)).toEqual([
      { label: "Brought forward from August 2026", value: "800", style: "line" },
      { label: "Earned in September 2026", value: "", style: "heading" },
      { label: "Commission (on work of Rs 4,000)", value: "400", style: "line" },
      { label: "Daily wage (1 day)", value: "800", style: "line" },
      { label: "Total earned", value: "1,200", style: "subtotal" },
      { label: "Taken in September 2026", value: "", style: "heading" },
      { label: "Payments", value: "-1,500", style: "line" },
      { label: "Advances", value: "-500", style: "line" },
      { label: "Total taken", value: "-2,000", style: "subtotal" },
      { label: "Payable to Sherry", value: "Rs 0", style: "total" },
    ]);
  });

  it("writes nothing taken as 0, not -0", () => {
    const earnedOnly = buildSlip("2026-09", [line("2026-09-01", "earning", "Daily wage", 800)]);
    const rows = summaryRows(earnedOnly, info);
    expect(rows.find((row) => row.label === "Advances")?.value).toBe("0");
    expect(rows.find((row) => row.label === "Total taken")?.value).toBe("0");
  });

  it("says what is to be recovered when more was taken than earned", () => {
    const owing = buildSlip("2026-09", [line("2026-09-01", "advance", "Advance", -3000)]);
    expect(summaryRows(owing, info).at(-1)).toEqual({ label: "Advance to recover from Sherry", value: "Rs 3,000", style: "total" });
  });

  it("shows salary, bonus and corrections only for someone they apply to", () => {
    const salaried = buildSlip("2026-09", [
      line("2026-09-30", "earning", "Monthly salary (September 2026)", 40000),
      line("2026-09-10", "bonus", "Bonus: Eid", 1000),
      line("2026-09-11", "adjustment", "Adjustment for August 2026: took less", 2000),
    ]);
    const rows = summaryRows(salaried, { ...info, paysWage: false, paysSalary: true, work: null });
    const labels = rows.map((row) => row.label);
    expect(labels).toContain("Monthly salary");
    expect(labels).toContain("Bonus");
    expect(labels).not.toContain("Daily wage (0 days)");
    expect(rows.find((row) => row.label === "Adjustments and corrections")?.value).toBe("+2,000");
    expect(labels).toContain("Commission");
  });

  it("tells a provisional slip that the salary comes at month close", () => {
    const rows = summaryRows(buildSlip("2026-10", []), { ...info, closedOn: null, paysSalary: true });
    expect(rows.map((row) => row.label)).toContain("Monthly salary (added when the month is closed)");
  });

  it("says what the commission was worked out on only when there was work", () => {
    const rows = summaryRows(buildSlip("2026-10", []), { ...info, work: 0 });
    expect(rows.map((row) => row.label)).toContain("Commission");
  });
});

describe("statusNote", () => {
  it("final once the month is closed, provisional until then", () => {
    expect(statusNote(info)).toBe(`Final: September 2026 was closed on 1 Oct 2026. These are its figures as of ${info.generatedAt}.`);
    // It no longer promises what a correction to a closed month would break (QA-16).
    expect(statusNote(info)).not.toMatch(/will not change/);
    expect(statusNote({ ...info, closedOn: null })).toMatch(/^Provisional: may change at month end/);
  });
});

describe("pdfSafe", () => {
  it("keeps plain text and replaces what the standard fonts cannot write", () => {
    expect(pdfSafe("Arshad Ali")).toBe("Arshad Ali");
    expect(pdfSafe("Sherry — ‘B’")).toBe("Sherry - 'B'");
    expect(pdfSafe("عارف")).toBe("????");
  });
});

describe("renderSlipPdf", () => {
  it("makes a PDF that reads back, one page for an ordinary month", async () => {
    const bytes = await renderSlipPdf(slip, info);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe("Salary slip - Sherry - September 2026");
  });

  it("carries a long month over onto a second page", async () => {
    const busy = buildSlip(
      "2026-10",
      Array.from({ length: 31 }, (_, day) => [
        line(`2026-10-${String(day + 1).padStart(2, "0")}`, "earning", "Daily wage", 800),
        line(`2026-10-${String(day + 1).padStart(2, "0")}`, "payment", "Payment", -500),
      ]).flat(),
    );
    const doc = await PDFDocument.load(await renderSlipPdf(busy, { ...info, monthLabel: "October 2026", closedOn: null }));
    expect(busy.days).toHaveLength(31);
    expect(doc.getPageCount()).toBe(2);
  });

  it("does not fail on a name the fonts cannot write", async () => {
    await expect(renderSlipPdf(slip, { ...info, staffName: "عارف" })).resolves.toBeInstanceOf(Uint8Array);
  });
});
