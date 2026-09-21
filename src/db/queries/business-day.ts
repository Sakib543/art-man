import { desc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { businessDays } from "@/db/schema";

/**
 * The business day that is currently open, or null if none is. The date does
 * not roll over with the clock: it changes only when a day is closed.
 */
export async function getOpenBusinessDay() {
  const [day] = await db
    .select()
    .from(businessDays)
    .where(isNull(businessDays.closedAt))
    .orderBy(desc(businessDays.businessDate))
    .limit(1);
  return day ?? null;
}

/** The most recent business day, open or closed. Null only before the first day is opened. */
export async function getLatestBusinessDay() {
  const [day] = await db.select().from(businessDays).orderBy(desc(businessDays.businessDate)).limit(1);
  return day ?? null;
}
