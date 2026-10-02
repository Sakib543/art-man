import { isMonthlySalaryLabel, type KhataKind, type Rupees } from "@/lib/accounting";
import { monthStart, nextMonth } from "@/lib/business-date";

/**
 * A staff member's salary slip for one month (backlog P3.3, spec §6.4): what
 * was brought forward, what they earned, what they took, and what is left —
 * in totals and day by day. The karigar's proof of the month's account.
 *
 * Pure: every khata line of the person comes in, the slip comes out. Nothing
 * here is stored; it is the khata, added up.
 */

export interface SlipLine {
  id: string;
  businessDate: string;
  kind: KhataKind;
  label: string;
  /** Positive = owed to the staff member, negative = taken. */
  amount: Rupees;
  /** Set on a line that cancels an earlier one: a reopened day, a correction, a cancelled adjustment. */
  reversesEntryId: string | null;
  /** Set on an advance, a payment, and on an advance's cancellation. */
  cashEntryId: string | null;
}

export type SlipCategory =
  | "commission"
  | "wage"
  | "salary"
  | "bonus"
  | "overtime"
  | "deduction"
  | "payment"
  | "advance"
  | "adjustment";

/** A reversal points at a line that points at nothing, so this is never reached; it stops a loop in bad data. */
const MAX_DEPTH = 5;

/**
 * Which part of the slip a khata line belongs to.
 *
 * A line that cancels another counts where that one did: a reopened day's
 * commission comes off the commission, a reversed payment off the payments,
 * so every total is net of its own corrections. Earnings are told apart by
 * the labels Day close and Month close write ("Commission (on work of …)",
 * "Daily wage", "Monthly salary (…)"). An adjustment that carries a cash entry
 * is an advance's cancellation (`voidEntry` in Daily folders) and nets against
 * the advances. Anything else — a P3.4 adjustment for an earlier month, and a
 * label this does not know — is an adjustment.
 */
export function categoryOf(line: SlipLine, byId: ReadonlyMap<string, SlipLine>, depth = 0): SlipCategory {
  if (line.reversesEntryId) {
    const original = byId.get(line.reversesEntryId);
    return original && depth < MAX_DEPTH ? categoryOf(original, byId, depth + 1) : "adjustment";
  }
  switch (line.kind) {
    case "earning":
      if (line.label.startsWith("Commission")) return "commission";
      if (line.label.startsWith("Daily wage")) return "wage";
      if (isMonthlySalaryLabel(line.label)) return "salary";
      return "adjustment";
    case "bonus":
      return "bonus";
    case "overtime":
      return "overtime";
    case "deduction":
      return "deduction";
    case "payment":
      return "payment";
    case "advance":
      return "advance";
    case "adjustment":
      return line.cashEntryId ? "advance" : "adjustment";
  }
}

export interface SlipTotals {
  commission: Rupees;
  wage: Rupees;
  salary: Rupees;
  bonus: Rupees;
  /** Overtime (P3.18), net of cancellations. */
  overtime: Rupees;
  /** Deductions (P3.18), as a positive amount, net of cancellations. */
  deductions: Rupees;
  /** Commission + wage + salary + bonus + overtime − deductions. */
  earned: Rupees;
  /** Money handed over, as a positive amount. */
  payments: Rupees;
  advances: Rupees;
  /** Payments + advances. */
  taken: Rupees;
  /** Adjustments and corrections that are neither, signed. */
  adjustments: Rupees;
}

export interface SlipDay {
  businessDate: string;
  commission: Rupees;
  wage: Rupees;
  /** Salary, bonus, overtime, deductions and adjustments, signed. */
  other: Rupees;
  /** Payments and advances, as a positive amount. */
  taken: Rupees;
  /** The khata balance at the end of the day. */
  balance: Rupees;
}

export interface Slip {
  month: string;
  /** The balance before the month began: + owed to them, - taken in advance. */
  broughtForward: Rupees;
  totals: SlipTotals;
  /** Days on which a daily wage was earned, net of reversals. */
  wageDays: number;
  /** Every day of the month that has a khata line, oldest first. */
  days: SlipDay[];
  /** broughtForward + earned - taken + adjustments: the balance at the month's end. */
  closingBalance: Rupees;
}

const EMPTY_TOTALS: SlipTotals = {
  commission: 0,
  wage: 0,
  salary: 0,
  bonus: 0,
  overtime: 0,
  deductions: 0,
  earned: 0,
  payments: 0,
  advances: 0,
  taken: 0,
  adjustments: 0,
};

/** The slip for `month` ("2026-09"), from every khata line the person has, in any order. */
export function buildSlip(month: string, lines: SlipLine[]): Slip {
  const start = monthStart(month);
  const end = monthStart(nextMonth(month));
  const byId = new Map(lines.map((line) => [line.id, line]));

  const broughtForward = lines.filter((line) => line.businessDate < start).reduce((sum, line) => sum + line.amount, 0);
  const inMonth = lines
    .filter((line) => line.businessDate >= start && line.businessDate < end)
    .sort((a, b) => a.businessDate.localeCompare(b.businessDate));

  const totals = { ...EMPTY_TOTALS };
  const byDay = new Map<string, Omit<SlipDay, "balance">>();

  for (const line of inMonth) {
    const category = categoryOf(line, byId);
    const day = byDay.get(line.businessDate) ?? { businessDate: line.businessDate, commission: 0, wage: 0, other: 0, taken: 0 };

    switch (category) {
      case "commission":
        totals.commission += line.amount;
        day.commission += line.amount;
        break;
      case "wage":
        totals.wage += line.amount;
        day.wage += line.amount;
        break;
      case "salary":
      case "bonus":
      case "overtime":
      case "deduction":
      case "adjustment":
        if (category === "salary") totals.salary += line.amount;
        if (category === "bonus") totals.bonus += line.amount;
        if (category === "overtime") totals.overtime += line.amount;
        // Taken off the khata, a negative line; the slip shows it as an amount taken off.
        if (category === "deduction") totals.deductions -= line.amount;
        if (category === "adjustment") totals.adjustments += line.amount;
        day.other += line.amount;
        break;
      case "payment":
      case "advance":
        // Taken money is a negative line; the slip shows it as an amount handed over.
        if (category === "payment") totals.payments -= line.amount;
        else totals.advances -= line.amount;
        day.taken -= line.amount;
        break;
    }
    byDay.set(line.businessDate, day);
  }

  totals.earned = totals.commission + totals.wage + totals.salary + totals.bonus + totals.overtime - totals.deductions;
  totals.taken = totals.payments + totals.advances;

  let balance = broughtForward;
  const days: SlipDay[] = [...byDay.values()].map((day) => {
    balance += day.commission + day.wage + day.other - day.taken;
    return { ...day, balance };
  });

  return {
    month,
    broughtForward,
    totals,
    wageDays: days.filter((day) => day.wage > 0).length,
    days,
    closingBalance: broughtForward + totals.earned - totals.taken + totals.adjustments,
  };
}

/**
 * "salary-slip-arshad-ali-2026-09.pdf": the name the download is saved under.
 * Plain letters and digits only, so every phone and every browser keeps it.
 */
export function slipFileName(staffName: string, month: string): string {
  const slug = staffName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `salary-slip-${slug || "staff"}-${month}.pdf`;
}
