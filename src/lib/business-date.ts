import type { BusinessDate } from "./accounting/types";

/** Today's calendar date in Karachi, as "YYYY-MM-DD". Used only to open the very first day. */
export function todayInKarachi(now: Date = new Date()): BusinessDate {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
}
