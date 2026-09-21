import { asc } from "drizzle-orm";
import { db } from "@/db";
import { getLatestBusinessDay } from "@/db/queries/business-day";
import { getDayBills } from "@/db/queries/day-bills";
import { staff } from "@/db/schema";
import { buildSheet, type Sheet } from "./grid";

export interface WorksheetData {
  businessDate: string;
  closed: boolean;
  sheet: Sheet;
  /** Staff who can take a quick add: the active ones. */
  quickAddIds: string[];
}

/** The latest business day as a register. Null before the first day is opened. */
export async function getWorksheetData(): Promise<WorksheetData | null> {
  const day = await getLatestBusinessDay();
  if (!day) return null;

  const [dayBills, staffRows] = await Promise.all([
    getDayBills(day.businessDate),
    db.select({ id: staff.id, name: staff.name, active: staff.active }).from(staff).orderBy(asc(staff.createdAt), asc(staff.name)),
  ]);

  // A column for every active staff member, and for anyone inactive who still has bills on this day.
  const worked = new Set(dayBills.flatMap((bill) => bill.lines.map((line) => line.staffId)));
  const columns = staffRows.filter((member) => member.active || worked.has(member.id));

  return {
    businessDate: day.businessDate,
    closed: day.closedAt !== null,
    sheet: buildSheet(dayBills, columns),
    quickAddIds: columns.filter((member) => member.active).map((member) => member.id),
  };
}
