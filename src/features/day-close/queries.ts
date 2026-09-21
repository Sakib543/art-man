import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { getLatestBusinessDay } from "@/db/queries/business-day";
import { billCancellations, bills, daySnapshots } from "@/db/schema";
import { workByStaff } from "@/lib/accounting";
import { loadDay, loadKhataBalances } from "./load";
import type { DayCloseData } from "./types";

/**
 * What the Day Close screen shows: nothing yet, the open day's checklist, or
 * the closed day's summary. Never includes expected cash before the count.
 */
export async function getDayCloseData(): Promise<DayCloseData> {
  const day = await getLatestBusinessDay();
  if (!day) return { state: "no-day" };

  if (!day.closedAt) {
    const [loaded, khata] = await Promise.all([loadDay(db, day.businessDate), loadKhataBalances(db)]);
    const work = workByStaff(loaded.bills);

    return {
      state: "open",
      businessDate: day.businessDate,
      openingCash: day.openingCash,
      staff: loaded.staff.map(({ id, name, pay }) => ({
        id,
        name,
        payType: pay.payType,
        salary: pay.salary,
        dailyWage: pay.dailyWage,
        commissionRate: pay.commissionRate,
        work: work[id] ?? 0,
        khataBalance: khata[id] ?? 0,
      })),
    };
  }

  const [snapshot] = await db.select().from(daySnapshots).where(eq(daySnapshots.businessDate, day.businessDate)).limit(1);
  const [{ cancelled }] = await db
    .select({ cancelled: count() })
    .from(billCancellations)
    .innerJoin(bills, eq(billCancellations.billId, bills.id))
    .where(eq(bills.businessDate, day.businessDate));

  return {
    state: "closed",
    snapshot: {
      businessDate: snapshot.businessDate,
      sale: snapshot.sale,
      cash: snapshot.cash,
      online: snapshot.online,
      expenses: snapshot.expenses,
      staffEarned: snapshot.staffEarned,
      staffPaid: snapshot.staffPaid,
      dayProfit: snapshot.dayProfit,
      openingCash: snapshot.openingCash,
      expectedCash: snapshot.expectedCash,
      countedCash: snapshot.countedCash,
      difference: snapshot.difference,
      diffReason: snapshot.diffReason,
      securityCode: snapshot.securityCode,
      closedBy: snapshot.closedBy,
      closedAt: snapshot.createdAt.toISOString(),
      cancelledBills: cancelled,
    },
  };
}
