import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { Rupees } from "@/lib/accounting";
import { formatDayMonth, num } from "@/lib/format";
import type { Slip } from "./slip";

/**
 * The salary slip as a PDF (backlog P3.3): one A4 sheet per karigar per month,
 * the totals first and then the month day by day, with room to sign. A file
 * to download and keep — the client wanted nothing sent anywhere.
 *
 * Only the fonts every PDF reader already has (Helvetica), so nothing is
 * embedded. They cover plain English text, which is all a slip holds except
 * the staff member's name — see `pdfSafe`.
 */

export interface SlipInfo {
  salonName: string;
  staffName: string;
  /** "Salary + commission (10%)". */
  payType: string;
  /** "September 2026". */
  monthLabel: string;
  /** "August 2026": where the balance was brought forward from. */
  previousMonthLabel: string;
  /** When the month was closed ("1 Oct 2026"); null while it is open, and the slip is provisional. */
  closedOn: string | null;
  /** Work done on the month's closed days, the commission's base. Null or 0 leaves it out. */
  work: Rupees | null;
  /** Show the commission, wage and salary lines even at 0: this person is paid that way. */
  paysCommission: boolean;
  paysWage: boolean;
  paysSalary: boolean;
  /** "29 Sep 2026, 22:10". */
  generatedAt: string;
}

const REPLACEMENTS: Record<string, string> = {
  "–": "-",
  "—": "-",
  "·": "-",
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
};

/**
 * Text the standard fonts can write. They know a Western character set only,
 * and a character outside it would stop the whole file being made; a name
 * typed in Urdu script comes out as question marks rather than no slip at all.
 */
export const pdfSafe = (text: string): string =>
  [...text].map((char) => REPLACEMENTS[char] ?? (char >= " " && char <= "~" ? char : "?")).join("");

/** "1,200" or "-1,200" — and "0", never "-0", for nothing taken. */
const money = (amount: Rupees): string => (amount < 0 ? `-${num(-amount)}` : num(Math.abs(amount)));
/** "+300": a correction can go either way, so its sign always shows. */
const signed = (amount: Rupees): string => (amount > 0 ? `+${num(amount)}` : money(amount));

export interface SummaryRow {
  label: string;
  value: string;
  style: "line" | "heading" | "subtotal" | "total";
}

/** The totals, top to bottom, so that each line follows from the ones above it. */
export function summaryRows(slip: Slip, info: SlipInfo): SummaryRow[] {
  const { totals } = slip;
  const rows: SummaryRow[] = [
    { label: `Brought forward from ${info.previousMonthLabel}`, value: money(slip.broughtForward), style: "line" },
    { label: `Earned in ${info.monthLabel}`, value: "", style: "heading" },
  ];

  if (info.paysCommission || totals.commission !== 0) {
    const on = info.work ? ` (on work of Rs ${num(info.work)})` : "";
    rows.push({ label: `Commission${on}`, value: money(totals.commission), style: "line" });
  }
  if (info.paysWage || totals.wage !== 0) {
    rows.push({ label: `Daily wage (${slip.wageDays} day${slip.wageDays === 1 ? "" : "s"})`, value: money(totals.wage), style: "line" });
  }
  if (info.paysSalary || totals.salary !== 0) {
    const pending = info.closedOn === null && totals.salary === 0 ? " (added when the month is closed)" : "";
    rows.push({ label: `Monthly salary${pending}`, value: money(totals.salary), style: "line" });
  }
  if (totals.bonus !== 0) rows.push({ label: "Bonus", value: money(totals.bonus), style: "line" });
  rows.push({ label: "Total earned", value: money(totals.earned), style: "subtotal" });

  rows.push({ label: `Taken in ${info.monthLabel}`, value: "", style: "heading" });
  rows.push({ label: "Payments", value: money(-totals.payments), style: "line" });
  rows.push({ label: "Advances", value: money(-totals.advances), style: "line" });
  rows.push({ label: "Total taken", value: money(-totals.taken), style: "subtotal" });

  if (totals.adjustments !== 0) {
    rows.push({ label: "Adjustments and corrections", value: signed(totals.adjustments), style: "line" });
  }

  const name = pdfSafe(info.staffName);
  rows.push({
    label: slip.closingBalance < 0 ? `Advance to recover from ${name}` : `Payable to ${name}`,
    value: `Rs ${num(Math.abs(slip.closingBalance))}`,
    style: "total",
  });
  return rows;
}

/**
 * The sentence under the heading: final, or provisional and why.
 *
 * Final, as of when the slip was made (P7.18, QA-16) — it used to promise
 * "These figures will not change", and a correction to a closed month, which
 * the client asked to be worked into it (P1.10), does change them. Which
 * correction, or whose, is not said: no Owner screen may show that.
 */
export function statusNote(info: SlipInfo): string {
  return info.closedOn
    ? `Final: ${info.monthLabel} was closed on ${info.closedOn}. These are its figures as of ${info.generatedAt}.`
    : "Provisional: may change at month end. A day's commission and wage are added when that day is closed.";
}

// A4, in points.
const WIDTH = 595.28;
const HEIGHT = 841.89;
const LEFT = 48;
const RIGHT = WIDTH - 48;
const TOP = HEIGHT - 40;
const BOTTOM = 54;

const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.42, 0.45, 0.5);
const RULE = rgb(0.84, 0.85, 0.87);
const TINT = rgb(0.97, 0.94, 0.87);
const FINAL = rgb(0.1, 0.45, 0.25);
const PROVISIONAL = rgb(0.66, 0.42, 0.04);

/** Day by day: where each column's right edge is. */
const COLUMNS = [
  { title: "Date", right: LEFT + 70, align: "left" as const },
  { title: "Commission", right: LEFT + 170 },
  { title: "Wage", right: LEFT + 245 },
  { title: "Other", right: LEFT + 320 },
  { title: "Taken", right: LEFT + 400 },
  { title: "Balance", right: RIGHT },
];

/** Writes down the page, and starts another when there is no room left. */
class Sheet {
  private pages: PDFPage[] = [];
  private page!: PDFPage;
  y = TOP;

  constructor(
    private doc: PDFDocument,
    private regular: PDFFont,
    private bold: PDFFont,
  ) {
    this.newPage();
  }

  newPage() {
    this.page = this.doc.addPage([WIDTH, HEIGHT]);
    this.pages.push(this.page);
    this.y = TOP;
  }

  /** Make sure `height` points fit on this page; if not, carry on at the top of the next. */
  room(height: number): boolean {
    if (this.y - height >= BOTTOM) return false;
    this.newPage();
    return true;
  }

  text(value: string, x: number, options: { size?: number; bold?: boolean; color?: RGB; align?: "left" | "right" } = {}) {
    const size = options.size ?? 10;
    const font = options.bold ? this.bold : this.regular;
    const safe = pdfSafe(value);
    const width = font.widthOfTextAtSize(safe, size);
    this.page.drawText(safe, { x: options.align === "right" ? x - width : x, y: this.y, size, font, color: options.color ?? INK });
  }

  /** Cut a label so it ends before `maxWidth`, rather than running into the figures. */
  fit(value: string, maxWidth: number, size: number, bold = false): string {
    const font = bold ? this.bold : this.regular;
    const safe = pdfSafe(value);
    if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
    let cut = safe;
    while (cut.length > 1 && font.widthOfTextAtSize(`${cut}...`, size) > maxWidth) cut = cut.slice(0, -1);
    return `${cut}...`;
  }

  /** A line to sign on, from `from` to `to` at the current height. */
  signLine(from: number, to: number) {
    this.page.drawLine({ start: { x: from, y: this.y }, end: { x: to, y: this.y }, thickness: 0.75, color: INK });
  }

  rule(y = this.y, color = RULE, thickness = 0.75) {
    this.page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness, color });
  }

  band(height: number, color: RGB) {
    this.page.drawRectangle({ x: LEFT, y: this.y - 4, width: RIGHT - LEFT, height, color });
  }

  /** "Page 1 of 2" and when it was made, on every page. */
  footers(generatedAt: string) {
    this.pages.forEach((page, index) => {
      const note = `Generated ${generatedAt}`;
      const count = `Page ${index + 1} of ${this.pages.length}`;
      page.drawText(pdfSafe(note), { x: LEFT, y: 36, size: 8, font: this.regular, color: MUTED });
      page.drawText(count, { x: RIGHT - this.regular.widthOfTextAtSize(count, 8), y: 36, size: 8, font: this.regular, color: MUTED });
    });
  }

  get pageCount() {
    return this.pages.length;
  }
}

function dayHeader(sheet: Sheet) {
  for (const column of COLUMNS) {
    sheet.text(column.title, column.align === "left" ? LEFT : column.right, { size: 8.5, bold: true, color: MUTED, align: column.align ?? "right" });
  }
  sheet.y -= 6;
  sheet.rule();
  sheet.y -= 13;
}

/** A dash rather than a column of zeros, so the days with something in them stand out. */
const cell = (amount: Rupees): string => (amount === 0 ? "-" : money(amount));

/** The slip, as the bytes of a PDF file. */
export async function renderSlipPdf(slip: Slip, info: SlipInfo): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(pdfSafe(`Salary slip - ${info.staffName} - ${info.monthLabel}`));
  doc.setAuthor(pdfSafe(info.salonName));
  doc.setCreator(pdfSafe(`${info.salonName} POS`));
  doc.setProducer(pdfSafe(`${info.salonName} POS`));

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const sheet = new Sheet(doc, regular, bold);

  // Heading: the salon and the month, and whether the figures are final.
  sheet.text(info.salonName.toUpperCase(), LEFT, { size: 17, bold: true });
  sheet.text("SALARY SLIP", RIGHT, { size: 12, bold: true, color: MUTED, align: "right" });
  sheet.y -= 18;
  sheet.text(info.monthLabel, LEFT, { size: 11 });
  sheet.text(info.closedOn ? "FINAL" : "PROVISIONAL", RIGHT, { size: 10, bold: true, color: info.closedOn ? FINAL : PROVISIONAL, align: "right" });
  sheet.y -= 12;
  sheet.rule(sheet.y, INK, 1);

  // Who.
  sheet.y -= 24;
  sheet.text(sheet.fit(info.staffName, RIGHT - LEFT, 15, true), LEFT, { size: 15, bold: true });
  sheet.y -= 16;
  sheet.text(info.payType, LEFT, { size: 10, color: MUTED });
  sheet.y -= 15;
  sheet.text(statusNote(info), LEFT, { size: 8.5, color: info.closedOn ? MUTED : PROVISIONAL });

  // The totals.
  sheet.y -= 22;
  for (const row of summaryRows(slip, info)) {
    if (row.style === "heading") {
      sheet.y -= 5;
      sheet.room(40);
      sheet.text(row.label, LEFT, { size: 9, bold: true, color: MUTED });
      sheet.y -= 15;
      continue;
    }
    sheet.room(22);
    if (row.style === "total") {
      sheet.y -= 6;
      sheet.band(20, TINT);
      sheet.text(sheet.fit(row.label, RIGHT - LEFT - 120, 11.5, true), LEFT + 8, { size: 11.5, bold: true });
      sheet.text(row.value, RIGHT - 8, { size: 11.5, bold: true, align: "right" });
      sheet.y -= 22;
      continue;
    }
    const strong = row.style === "subtotal";
    const indent = row.style === "line" && !row.label.startsWith("Brought forward") && !row.label.startsWith("Adjustments") ? 12 : 0;
    sheet.text(sheet.fit(row.label, RIGHT - LEFT - 120 - indent, 10, strong), LEFT + indent, { size: 10, bold: strong });
    sheet.text(row.value, RIGHT, { size: 10, bold: strong, align: "right" });
    sheet.y -= 5;
    if (strong) sheet.rule(sheet.y + 14.5);
    sheet.y -= 10;
  }

  // Room to sign, right under what is being signed for, so it never ends up
  // on a page of its own after a long month.
  sheet.y -= 26;
  sheet.room(30);
  const half = LEFT + (RIGHT - LEFT) / 2;
  sheet.signLine(LEFT, LEFT + 200);
  sheet.signLine(half + 20, RIGHT);
  sheet.y -= 12;
  sheet.text("Karigar's signature", LEFT, { size: 8.5, color: MUTED });
  sheet.text("Owner / Manager", half + 20, { size: 8.5, color: MUTED });

  // Day by day.
  sheet.y -= 24;
  sheet.room(60);
  sheet.text(`${info.monthLabel}, day by day`, LEFT, { size: 11, bold: true });
  sheet.y -= 18;
  dayHeader(sheet);
  if (slip.days.length === 0) {
    sheet.text("Nothing in the khata this month.", LEFT, { size: 9.5, color: MUTED });
    sheet.y -= 14;
  }
  for (const day of slip.days) {
    if (sheet.room(15)) dayHeader(sheet);
    const values = [formatDayMonth(day.businessDate), cell(day.commission), cell(day.wage), cell(day.other), cell(day.taken), money(day.balance)];
    COLUMNS.forEach((column, index) => {
      sheet.text(values[index], column.align === "left" ? LEFT : column.right, { size: 9.5, align: column.align ?? "right" });
    });
    // 12.5 points a day keeps a month with a day off a week on one sheet.
    sheet.y -= 12.5;
  }
  sheet.rule(sheet.y + 9);
  sheet.y -= 6;
  sheet.text("Other: salary, bonus and adjustments. Taken: payments and advances. Balance: + owed to them, - taken in advance.", LEFT, { size: 7.5, color: MUTED });

  sheet.footers(info.generatedAt);
  return doc.save();
}
