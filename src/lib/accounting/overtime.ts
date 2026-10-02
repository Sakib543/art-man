import type { Rupees } from "./types";

/**
 * Overtime (backlog P3.18): hours at the karigar's own rate in rupees an hour.
 *
 * Hours are worked in hundredths, as whole numbers: 1.13 h is 113. As a float,
 * 1.13 × 150 comes to 169.49999999999997 and would round to 169; 113 × 150 /
 * 100 is 169.5 exactly, and rounds half up to 170 — the same rule as
 * commission (`commissionOn`). Two decimals is all an hour needs: a quarter is
 * 0.25.
 */
export const hoursHundredths = (hours: number): number => Math.round(hours * 100);

/** At most two decimals: 1.5 and 2.25 are hours, 1.333 is not. */
export const hasHourDecimals = (hours: number): boolean => Math.abs(hours * 100 - hoursHundredths(hours)) < 1e-6;

/** Pay for `hours` of overtime at `ratePerHour`, rounded to the rupee once. */
export function overtimePay(hours: number, ratePerHour: Rupees): Rupees {
  return Math.round((hoursHundredths(hours) * ratePerHour) / 100);
}

/** "3 h", "1.5 h", "2.25 h". */
export const formatHours = (hours: number): string => `${hoursHundredths(hours) / 100} h`;
