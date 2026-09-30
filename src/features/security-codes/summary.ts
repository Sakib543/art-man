import type { DayCheck } from "@/db/day-code";
import { formatDayMonth } from "@/lib/format";

/**
 * The line at the top of the Security codes screen (P7.8): all of the month's
 * closed days match their records, or which do not. Pure.
 */
export function checkSummary(days: readonly DayCheck[], monthLabel: string): { ok: boolean; text: string } {
  if (days.length === 0) return { ok: true, text: `No day of ${monthLabel} has been closed yet.` };
  const failing = days.filter((day) => !day.ok);
  if (failing.length === 0) {
    return {
      ok: true,
      text: days.length === 1 ? `The closed day of ${monthLabel} matches its records.` : `All ${days.length} closed days of ${monthLabel} match their records.`,
    };
  }
  const which = failing.map((day) => formatDayMonth(day.businessDate)).join(", ");
  return {
    ok: false,
    text: `${failing.length} of ${days.length} closed days ${failing.length === 1 ? "does" : "do"} not match ${failing.length === 1 ? "its" : "their"} records: ${which}. Something in ${failing.length === 1 ? "it" : "them"} was changed after the day was closed, outside the app.`,
  };
}
