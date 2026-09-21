import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { getMonthlyReport } from "@/db/queries/month-report";
import { businessDays, monthCloses, partners, staff } from "@/db/schema";
import { checkShares, type Rupees } from "@/lib/accounting";
import { monthOf } from "@/lib/business-date";
import { closeBlockers } from "./rules";

export interface SalaryLine {
  staffId: string;
  name: string;
  salary: Rupees;
}

export interface CloseState {
  month: string;
  closed: boolean;
  blockers: string[];
  /** Monthly salaries that closing adds to the staff khata. */
  salaries: SalaryLine[];
  closedDays: number;
  netProfit: Rupees;
  /** The last business day of the month, which the salaries are dated with. */
  lastDay: string | null;
}

/** Everything the Month close card needs: whether it can be closed, and what closing will do. */
export async function getCloseState(month: string): Promise<CloseState> {
  const [days, closedRows, staffRows, partnerRows, report] = await Promise.all([
    db.select({ date: businessDays.businessDate, closedAt: businessDays.closedAt }).from(businessDays).orderBy(asc(businessDays.businessDate)),
    db.select({ month: monthCloses.month }).from(monthCloses),
    db.select().from(staff).where(eq(staff.active, true)).orderBy(asc(staff.createdAt)),
    db.select({ sharePct: partners.sharePct }).from(partners).where(eq(partners.active, true)),
    getMonthlyReport(month),
  ]);

  const closedMonths = new Set(closedRows.map((row) => monthOf(row.month)));
  const inMonth = days.filter((day) => monthOf(day.date) === month);
  const earlierOpenMonths = [...new Set(days.map((day) => monthOf(day.date)))].filter((m) => m < month && !closedMonths.has(m));

  const blockers = closeBlockers({
    month,
    alreadyClosed: closedMonths.has(month),
    closedDays: inMonth.filter((day) => day.closedAt !== null).length,
    openDays: inMonth.filter((day) => day.closedAt === null).map((day) => day.date),
    earlierOpenMonths,
    sharesValid: checkShares(partnerRows.map((p) => p.sharePct)).ok,
  });

  return {
    month,
    closed: closedMonths.has(month),
    blockers,
    salaries: staffRows
      .filter((s) => (s.payType === 1 || s.payType === 2) && s.salary > 0)
      .map((s) => ({ staffId: s.id, name: s.name, salary: s.salary })),
    closedDays: inMonth.filter((day) => day.closedAt !== null).length,
    netProfit: report?.live.netProfit ?? 0,
    lastDay: inMonth.at(-1)?.date ?? null,
  };
}
