import { checkDayCodes } from "@/db/day-code";
import { getMonthChoices } from "@/db/queries/months";
import { formatMonth, lastDateOfMonth, monthStart } from "@/lib/business-date";
import type { SecurityCodesData } from "./types";

/**
 * Every closed day of a month, its code worked out again from its records
 * (backlog P7.8). The month in the URL, or the latest business day's.
 */
export async function getSecurityCodes(requestedMonth?: string): Promise<SecurityCodesData | null> {
  const choices = await getMonthChoices();
  if (!choices) return null;
  const month = requestedMonth && choices.choices.some((choice) => choice.month === requestedMonth) ? requestedMonth : choices.current;

  const days = await checkDayCodes(monthStart(month), lastDateOfMonth(month));
  return { month, monthLabel: formatMonth(month), months: choices.choices, days };
}
