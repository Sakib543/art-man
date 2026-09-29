import { asc } from "drizzle-orm";
import { db } from "@/db";
import { staff } from "@/db/schema";
import type { PayType, StaffPay } from "@/lib/accounting";
import type { DayCopy, DayStaff } from "@/lib/offline/day";
import { getOpenBusinessDay } from "./business-day";
import { getDayBills } from "./day-bills";
import { loadKhataBalances } from "./day-data";
import { getDayEntries } from "./day-entries";

/**
 * Every staff member, active or not, in the order they joined — what the
 * register picks its columns from (`columnsFor` in `features/worksheet`) —
 * with their pay, which Day Close works earnings out from (P2.2f).
 */
export async function getAllStaff(): Promise<(DayStaff & { pay: StaffPay })[]> {
  const rows = await db
    .select({
      id: staff.id,
      name: staff.name,
      active: staff.active,
      payType: staff.payType,
      salary: staff.salary,
      dailyWage: staff.dailyWage,
      commissionRate: staff.commissionRate,
    })
    .from(staff)
    .orderBy(asc(staff.createdAt), asc(staff.name));
  return rows.map(({ id, name, active, payType, salary, dailyWage, commissionRate }) => ({
    id,
    name,
    active,
    pay: { payType: payType as PayType, salary, dailyWage, commissionRate },
  }));
}

/**
 * The counter's copy of the open day (P2.2e): its bills and folder entries —
 * read by the same queries as Billing, the register and Daily folders, so the
 * copy lists what those screens list — and the staff for the register's
 * columns. Since P2.2f it also holds what Day Close reads before the count —
 * the opening cash, everyone's pay and the khata balances (`loadKhataBalances`,
 * the close's own query) — so the day can be closed with no server. Served by
 * `app/api/offline/day`.
 */
export async function getDayCopy(): Promise<DayCopy> {
  const day = await getOpenBusinessDay();
  const servedAt = new Date().toISOString();
  if (!day) return { businessDate: null, bills: [], entries: [], staff: [], servedAt, close: null };

  const [bills, entries, staffRows, khata] = await Promise.all([
    getDayBills(day.businessDate),
    getDayEntries(day.businessDate),
    getAllStaff(),
    loadKhataBalances(db),
  ]);
  return {
    businessDate: day.businessDate,
    bills,
    entries,
    staff: staffRows.map(({ id, name, active }) => ({ id, name, active })),
    servedAt,
    close: {
      openingCash: day.openingCash,
      pay: Object.fromEntries(staffRows.map((member) => [member.id, member.pay])),
      khata,
    },
  };
}
