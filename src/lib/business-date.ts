import type { BusinessDate } from "./accounting/types";

/** "2026-09-21" -> "2026-09". Months are identified by this key. */
export const monthOf = (isoDate: string): string => isoDate.slice(0, 7);

/** "2026-09" -> "2026-09-01". Monthly records store the first day of their month. */
export const monthStart = (month: string): string => `${month}-01`;

/** "2026-09" -> "2026-10". */
export function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** "2026-09" -> "September 2026". */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** The calendar day after an ISO date: "2026-09-30" -> "2026-10-01". */
export function nextDate(isoDate: BusinessDate): BusinessDate {
  const [y, m, d] = isoDate.split("-").map(Number);
  // UTC, so daylight-saving shifts on the machine can never move the date.
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/**
 * The Karachi calendar date of a moment in time ("2026-09-21T20:00:00Z" -> "2026-09-22").
 * Servers run in UTC, so never cut the date off an ISO timestamp with slice().
 */
export function karachiDate(moment: string | Date): BusinessDate {
  return new Date(moment).toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
}

/** Today's calendar date in Karachi, as "YYYY-MM-DD". Used only to open the very first day. */
export function todayInKarachi(now: Date = new Date()): BusinessDate {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
}
