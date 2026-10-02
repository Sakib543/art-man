import { describe, expect, it } from "vitest";
import { buildSlip, categoryOf, slipFileName, type SlipLine } from "./slip";

let next = 0;
/** A khata line as Day close, Daily folders, Month close and P3.4 write them. */
const line = (businessDate: string, kind: SlipLine["kind"], label: string, amount: number, extra: Partial<SlipLine> = {}): SlipLine => ({
  id: `line-${++next}`,
  businessDate,
  kind,
  label,
  amount,
  reversesEntryId: null,
  cashEntryId: null,
  ...extra,
});

// August: earned 1,200, took 1,000 — so 200 is brought forward into September.
const august = [line("2026-08-30", "earning", "Commission (on work of 12000)", 1200), line("2026-08-31", "payment", "Payment", -1000, { cashEntryId: "c0" })];

const wage1 = line("2026-09-01", "earning", "Daily wage", 800);
const commission1 = line("2026-09-01", "earning", "Commission (on work of 4000)", 400);
const advance = line("2026-09-02", "advance", "Advance", -500, { cashEntryId: "c1" });
const adjustment = line("2026-09-05", "adjustment", "Adjustment for August 2026: advance entered twice", 300);

const september = [
  wage1,
  commission1,
  line("2026-09-01", "payment", "Payment", -1000, { cashEntryId: "c2" }),
  advance,
  // The advance was a mistake and was cancelled in Daily folders.
  line("2026-09-02", "adjustment", "Advance cancelled", 500, { cashEntryId: "c3" }),
  line("2026-09-03", "earning", "Daily wage", 800),
  // The day was reopened: its wage reversed, then posted again at the next close.
  line("2026-09-04", "earning", "Daily wage", 800),
  line("2026-09-04", "adjustment", 'Day reopened: reversal of "Daily wage"', -800, { reversesEntryId: "line-x" }),
  line("2026-09-04", "earning", "Daily wage", 800),
  // A bill in a closed day was cancelled: its commission corrected.
  line("2026-09-01", "adjustment", "Corrected: bill #7 cancelled", -400, { reversesEntryId: commission1.id }),
  line("2026-09-01", "earning", "Commission (on work of 3000)", 300),
  line("2026-09-10", "bonus", "Bonus: Eid", 1000),
  adjustment,
  line("2026-09-06", "adjustment", "Adjustment for August 2026 cancelled: wrong person", -300, { reversesEntryId: adjustment.id }),
  line("2026-09-30", "earning", "Monthly salary (September 2026)", 20000),
];
// The reopen's reversal points at the first 4 Sep wage.
september[7] = { ...september[7], reversesEntryId: september[6].id };

const october = [line("2026-10-01", "earning", "Daily wage", 800)];

describe("categoryOf (backlog P3.3)", () => {
  const byId = new Map([...august, ...september].map((l) => [l.id, l]));

  it("tells the earnings apart by the labels Day close and Month close write", () => {
    expect(categoryOf(wage1, byId)).toBe("wage");
    expect(categoryOf(commission1, byId)).toBe("commission");
    expect(categoryOf(september[14], byId)).toBe("salary");
    expect(categoryOf(september[11], byId)).toBe("bonus");
  });

  it("counts a reversal where the line it reverses counted", () => {
    expect(categoryOf(september[7], byId)).toBe("wage");
    expect(categoryOf(september[9], byId)).toBe("commission");
  });

  it("nets an advance's cancellation against the advances", () => {
    expect(categoryOf(september[4], byId)).toBe("advance");
  });

  it("keeps a P3.4 adjustment, and its cancellation, as an adjustment", () => {
    expect(categoryOf(adjustment, byId)).toBe("adjustment");
    expect(categoryOf(september[13], byId)).toBe("adjustment");
  });

  it("shows an unknown earning, or a reversal of a missing line, as an adjustment rather than guess", () => {
    expect(categoryOf(line("2026-09-01", "earning", "Something new", 50), byId)).toBe("adjustment");
    expect(categoryOf(line("2026-09-01", "adjustment", "Reversal", -50, { reversesEntryId: "gone" }), byId)).toBe("adjustment");
  });
});

describe("buildSlip", () => {
  const slip = buildSlip("2026-09", [...october, ...september, ...august]);

  it("brings the balance forward from before the month", () => {
    expect(slip.broughtForward).toBe(200);
  });

  it("adds the month up, every total net of its corrections", () => {
    expect(slip.totals).toEqual({
      commission: 300,
      wage: 2400,
      salary: 20000,
      bonus: 1000,
      overtime: 0,
      deductions: 0,
      earned: 23700,
      payments: 1000,
      advances: 0,
      taken: 1000,
      adjustments: 0,
    });
  });

  it("ends where the khata ends: brought forward plus every line of the month", () => {
    const sum = september.reduce((total, l) => total + l.amount, 0);
    expect(slip.closingBalance).toBe(200 + sum);
    expect(slip.closingBalance).toBe(200 + 23700 - 1000 + 0);
    expect(slip.days.at(-1)?.balance).toBe(slip.closingBalance);
  });

  it("counts the days a wage was earned, not the wage lines", () => {
    // 1, 3 and 4 Sep; 4 Sep had its wage reversed and posted again.
    expect(slip.wageDays).toBe(3);
  });

  it("gives one row per day, oldest first, with the running balance", () => {
    expect(slip.days.map((d) => d.businessDate)).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
      "2026-09-10",
      "2026-09-30",
    ]);
    expect(slip.days[0]).toEqual({ businessDate: "2026-09-01", commission: 300, wage: 800, other: 0, taken: 1000, balance: 200 + 300 + 800 - 1000 });
    // The advance and its cancellation, on the same day, come to nothing.
    expect(slip.days[1]).toMatchObject({ taken: 0 });
  });

  it("leaves out what came after the month", () => {
    expect(slip.days.some((d) => d.businessDate >= "2026-10-01")).toBe(false);
  });

  it("a month with no lines is the balance brought forward and nothing else", () => {
    const empty = buildSlip("2026-11", [...august, ...september, ...october]);
    expect(empty.days).toEqual([]);
    expect(empty.closingBalance).toBe(empty.broughtForward);
    expect(empty.totals.earned).toBe(0);
  });

  it("shows money taken beyond what was earned as a negative balance", () => {
    const owed = buildSlip("2026-09", [line("2026-09-01", "advance", "Advance", -3000, { cashEntryId: "c9" }), line("2026-09-01", "earning", "Daily wage", 800)]);
    expect(owed.totals.advances).toBe(3000);
    expect(owed.closingBalance).toBe(-2200);
  });
});

describe("slipFileName", () => {
  it("names the file after the person and the month, in plain letters", () => {
    expect(slipFileName("Arshad Ali", "2026-09")).toBe("salary-slip-arshad-ali-2026-09.pdf");
    expect(slipFileName("  Sherry (B) ", "2026-10")).toBe("salary-slip-sherry-b-2026-10.pdf");
  });

  it("still names it when the name has no plain letters at all", () => {
    expect(slipFileName("عارف", "2026-09")).toBe("salary-slip-staff-2026-09.pdf");
  });
});

describe("overtime and deductions on the slip (P3.18)", () => {
  const overtime = line("2026-09-12", "overtime", "Overtime 3 h × Rs 150: wedding party", 450);
  const wrongOvertime = line("2026-09-13", "overtime", "Overtime 2 h × Rs 150: wrong day", 300);
  const deduction = line("2026-09-14", "deduction", "Deduction: late two hours", -300);
  const lines = [
    line("2026-09-12", "earning", "Commission (on work of 5900)", 590),
    overtime,
    wrongOvertime,
    line("2026-09-13", "overtime", "Cancelled: Overtime 2 h × Rs 150: wrong day (entered twice)", -300, { reversesEntryId: wrongOvertime.id }),
    deduction,
    line("2026-09-30", "earning", "Monthly salary (September 2026)", 20000),
  ];
  const slip = buildSlip("2026-09", lines);

  it("counts overtime with what was earned and takes a deduction off it, cancellations netted", () => {
    expect(slip.totals).toMatchObject({ commission: 590, salary: 20000, overtime: 450, deductions: 300, adjustments: 0 });
    expect(slip.totals.earned).toBe(590 + 20000 + 450 - 300);
  });

  it("puts them in the day's Other column, and the balance follows", () => {
    expect(slip.days.find((day) => day.businessDate === "2026-09-13")?.other).toBe(0);
    expect(slip.days.find((day) => day.businessDate === "2026-09-14")?.other).toBe(-300);
    expect(slip.closingBalance).toBe(590 + 450 - 300 + 20000);
    expect(slip.days.at(-1)?.balance).toBe(slip.closingBalance);
  });

  it("counts a cancellation where the line it cancels counted", () => {
    const byId = new Map(lines.map((l) => [l.id, l]));
    expect(categoryOf(lines[3], byId)).toBe("overtime");
    expect(categoryOf(deduction, byId)).toBe("deduction");
  });
});
