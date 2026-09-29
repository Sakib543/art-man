import { asc } from "drizzle-orm";
import { db } from "@/db";
import { staff } from "@/db/schema";
import type { DayCopy, DayStaff } from "@/lib/offline/day";
import { getOpenBusinessDay } from "./business-day";
import { getDayBills } from "./day-bills";
import { getDayEntries } from "./day-entries";

/**
 * Every staff member, active or not, in the order they joined — what the
 * register picks its columns from (`columnsFor` in `features/worksheet`).
 */
export async function getAllStaff(): Promise<DayStaff[]> {
  return db
    .select({ id: staff.id, name: staff.name, active: staff.active })
    .from(staff)
    .orderBy(asc(staff.createdAt), asc(staff.name));
}

/**
 * The counter's copy of the open day (P2.2e): its bills and folder entries —
 * read by the same queries as Billing, the register and Daily folders, so the
 * copy lists what those screens list — and the staff for the register's
 * columns. Served by `app/api/offline/day`.
 */
export async function getDayCopy(): Promise<DayCopy> {
  const day = await getOpenBusinessDay();
  const servedAt = new Date().toISOString();
  if (!day) return { businessDate: null, bills: [], entries: [], staff: [], servedAt };

  const [bills, entries, staffRows] = await Promise.all([
    getDayBills(day.businessDate),
    getDayEntries(day.businessDate),
    getAllStaff(),
  ]);
  return { businessDate: day.businessDate, bills, entries, staff: staffRows, servedAt };
}
