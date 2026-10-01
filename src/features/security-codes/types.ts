import type { DayCheck } from "@/db/day-code";
import type { MonthChoice } from "@/db/queries/months";
import type { SecurityKeyStatus } from "@/lib/security-key";

/** The Security codes screen for one month (backlog P7.8). */
export interface SecurityCodesData {
  month: string;
  monthLabel: string;
  months: MonthChoice[];
  /** The month's closed days, oldest first, each checked against its records. Empty while the key is set wrongly. */
  days: DayCheck[];
  /** Whether the server seals codes with a key of its own (P7.8b). */
  key: SecurityKeyStatus;
}
