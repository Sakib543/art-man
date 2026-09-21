import type { BusinessDate } from "./accounting/types";

/** The calendar day after an ISO date: "2026-09-30" -> "2026-10-01". */
export function nextDate(isoDate: BusinessDate): BusinessDate {
  const [y, m, d] = isoDate.split("-").map(Number);
  // UTC, so daylight-saving shifts on the machine can never move the date.
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** Today's calendar date in Karachi, as "YYYY-MM-DD". Used only to open the very first day. */
export function todayInKarachi(now: Date = new Date()): BusinessDate {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
}
