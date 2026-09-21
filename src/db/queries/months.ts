import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { getLatestBusinessDay } from "@/db/queries/business-day";
import { businessDays, monthCloses } from "@/db/schema";
import { formatMonth, monthOf, monthStart } from "@/lib/business-date";

export interface MonthChoice {
  month: string;
  label: string;
  closed: boolean;
}

/** Has the Owner closed this month? A closed month is frozen. */
export async function isMonthClosed(month: string): Promise<boolean> {
  const [row] = await db.select({ month: monthCloses.month }).from(monthCloses).where(eq(monthCloses.month, monthStart(month))).limit(1);
  return row !== undefined;
}

/**
 * The months the Owner can look at: every month that has a business day, newest
 * first, plus the month of the latest day. `current` is the one to show by default.
 */
export async function getMonthChoices(): Promise<{ choices: MonthChoice[]; current: string } | null> {
  const latest = await getLatestBusinessDay();
  if (!latest) return null;

  const [dayRows, closedRows] = await Promise.all([
    db.select({ date: businessDays.businessDate }).from(businessDays).orderBy(desc(businessDays.businessDate)),
    db.select({ month: monthCloses.month }).from(monthCloses),
  ]);

  const closed = new Set(closedRows.map((row) => monthOf(row.month)));
  const months = [...new Set(dayRows.map((row) => monthOf(row.date)))];

  return {
    choices: months.map((month) => ({ month, label: formatMonth(month), closed: closed.has(month) })),
    current: monthOf(latest.businessDate),
  };
}
