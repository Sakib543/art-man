import { formatDayMonth } from "@/lib/format";
import { formatMonth } from "@/lib/business-date";

export interface CloseCheckInput {
  month: string;
  alreadyClosed: boolean;
  /** Days of this month that are closed. */
  closedDays: number;
  /** Business dates of this month that are still open. */
  openDays: string[];
  /** Earlier months (oldest first) that have days but are not closed yet. */
  earlierOpenMonths: string[];
  /** Do the partners' shares add up to 100%? They are saved with the month. */
  sharesValid: boolean;
}

/**
 * Why a month cannot be closed yet. Empty means it can. Closing freezes the
 * month, so everything it depends on must be settled first.
 */
export function closeBlockers(input: CloseCheckInput): string[] {
  if (input.alreadyClosed) return [`${formatMonth(input.month)} is already closed.`];

  const blockers: string[] = [];
  if (input.earlierOpenMonths.length > 0) {
    blockers.push(`Close ${formatMonth(input.earlierOpenMonths[0])} first.`);
  }
  if (input.openDays.length > 0) {
    blockers.push(`Close the open business day (${formatDayMonth(input.openDays[0])}) in Day close first.`);
  }
  if (input.closedDays === 0 && input.openDays.length === 0) {
    blockers.push("This month has no closed days yet.");
  }
  if (!input.sharesValid) {
    blockers.push("The partners' shares must add up to 100%. Fix them on the Partners screen.");
  }
  return blockers;
}
