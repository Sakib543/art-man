import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { getDayBills, type DayBill } from "@/db/queries/day-bills";
import { businessDays, daySnapshots } from "@/db/schema";
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
  bills: DayBill[];
  summary: ReportSummary;
  /** Only for a closed day. */
  closing: ClosingFigures | null;
}

/** The report for one business day: the requested date if it exists, otherwise the latest. */
export async function getDailyReport(requestedDate?: string): Promise<DailyReport | null> {
  const dayRows = await db.select().from(businessDays).orderBy(desc(businessDays.businessDate));
  if (dayRows.length === 0) return null;

  const days = dayRows.map((day) => ({ businessDate: day.businessDate, closed: day.closedAt !== null }));
  const selected = days.find((day) => day.businessDate === requestedDate) ?? days[0];

  const bills = await getDayBills(selected.businessDate);

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

  return { days, selected, bills, summary: summarizeBills(bills), closing };
}
