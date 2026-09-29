import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { getDayBills } from "@/db/queries/day-bills";
import { isMonthClosed } from "@/db/queries/months";
import { businessDays, daySnapshots } from "@/db/schema";
import { monthOf } from "@/lib/business-date";
import { foldCorrections, type ReportBill } from "./corrections";
import { summarizeBills, type ReportSummary } from "./summary";

export interface ReportDay {
  businessDate: string;
  closed: boolean;
}

export interface ClosingFigures {
  expectedCash: number;
  countedCash: number;
  difference: number;
  securityCode: string;
}

export interface DailyReport {
  /** Every business day, newest first, for the day picker. */
  days: ReportDay[];
  selected: ReportDay;
  /** One row per bill: a correction's three rows are folded into the newest (P1.5). */
  bills: ReportBill[];
  summary: ReportSummary;
  /** Only for a closed day. */
  closing: ClosingFigures | null;
  /**
   * Is the day's month closed? Then nothing in it can be cancelled any more;
   * a mistake is put right with an adjustment in the open month (P3.4).
   */
  monthClosed: boolean;
}

/** The report for one business day: the requested date if it exists, otherwise the latest. */
export async function getDailyReport(requestedDate?: string): Promise<DailyReport | null> {
  const dayRows = await db.select().from(businessDays).orderBy(desc(businessDays.businessDate));
  if (dayRows.length === 0) return null;

  const days = dayRows.map((day) => ({ businessDate: day.businessDate, closed: day.closedAt !== null }));
  const selected = days.find((day) => day.businessDate === requestedDate) ?? days[0];

  const [dayBills, monthClosed] = await Promise.all([
    getDayBills(selected.businessDate),
    selected.closed ? isMonthClosed(monthOf(selected.businessDate)) : Promise.resolve(false),
  ]);
  const bills = foldCorrections(dayBills);

  let closing: ClosingFigures | null = null;
  if (selected.closed) {
    const [snapshot] = await db.select().from(daySnapshots).where(eq(daySnapshots.businessDate, selected.businessDate)).limit(1);
    if (snapshot) {
      closing = {
        expectedCash: snapshot.expectedCash,
        countedCash: snapshot.countedCash,
        difference: snapshot.difference,
        securityCode: snapshot.securityCode,
      };
    }
  }

  return { days, selected, bills, summary: summarizeBills(bills), closing, monthClosed };
}
