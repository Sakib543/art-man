import type { DayCheck } from "@/db/day-code";
import type { MonthChoice } from "@/db/queries/months";

/** The Security codes screen for one month (backlog P7.8). */
export interface SecurityCodesData {
  month: string;
  monthLabel: string;
  months: MonthChoice[];
  /** The month's closed days, oldest first, each checked against its records. */
  days: DayCheck[];
}
