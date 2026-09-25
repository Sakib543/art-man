import { asc } from "drizzle-orm";
import { db } from "@/db";
import { getDayBills } from "@/db/queries/day-bills";
import { staff } from "@/db/schema";
import { buildSheet, type Sheet } from "./grid";

/**
 * Any business day as a register — the Daily report's Register view (P6.4).
 * It used to be the latest day only, on a screen of its own.
 */
export async function getSheet(businessDate: string): Promise<Sheet> {
  const [dayBills, staffRows] = await Promise.all([
    getDayBills(businessDate),
    db.select({ id: staff.id, name: staff.name, active: staff.active }).from(staff).orderBy(asc(staff.createdAt), asc(staff.name)),
  ]);

  // A column for every active staff member, and for anyone inactive who still has bills on this day.
  const worked = new Set(dayBills.flatMap((bill) => bill.lines.map((line) => line.staffId)));
  const columns = staffRows.filter((member) => member.active || worked.has(member.id));

  return buildSheet(dayBills, columns);
}
