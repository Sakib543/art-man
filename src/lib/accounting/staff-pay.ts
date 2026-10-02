import type { DayPay, PayType, Rupees, StaffPay } from "./types";

/**
 * The parts a pay type is made of (backlog P3.17): a monthly salary, a daily
 * wage for each day present, a commission on the staff member's own work —
 * any mix of them, at least one. Types 1–3 are the spec's three (§6.1) and keep
 * their numbers; 4–7 are the other mixes, added at the client's request
 * (2026-10-02: "a fixed salary plus Rs 200 for each day present").
 */
export interface PayParts {
  salary: boolean;
  dailyWage: boolean;
  commission: boolean;
}

export const PAY_PARTS: Readonly<Record<PayType, Readonly<PayParts>>> = {
  1: { salary: true, dailyWage: false, commission: false },
  2: { salary: true, dailyWage: false, commission: true },
  3: { salary: false, dailyWage: true, commission: true },
  4: { salary: false, dailyWage: false, commission: true },
  5: { salary: true, dailyWage: true, commission: false },
  6: { salary: true, dailyWage: true, commission: true },
  7: { salary: false, dailyWage: true, commission: false },
};

export const PAY_TYPES: readonly PayType[] = [1, 2, 3, 4, 5, 6, 7];

export const PAY_TYPE_LABEL: Record<PayType, string> = {
  1: "Monthly salary",
  2: "Salary + commission",
  3: "Daily wage + commission",
  4: "Commission only",
  5: "Salary + daily wage",
  6: "Salary + daily wage + commission",
  7: "Daily wage only",
};

export const isPayType = (value: unknown): value is PayType => PAY_TYPES.includes(value as PayType);

/** The pay type made of exactly these parts; null when none is chosen. */
export function payTypeOf(parts: PayParts): PayType | null {
  return (
    PAY_TYPES.find((type) => {
      const own = PAY_PARTS[type];
      return own.salary === parts.salary && own.dailyWage === parts.dailyWage && own.commission === parts.commission;
    }) ?? null
  );
}

/**
 * The khata label Month close gives a monthly salary, e.g. "Monthly salary
 * (September 2026)". It is dated on the month's last business day, beside that
 * day's own commission and wage, so settling that day again must be able to
 * tell it from them: no bill moves a salary (backlog P1.10).
 */
export const monthlySalaryLabel = (monthName: string): string => `Monthly salary (${monthName})`;
export const isMonthlySalaryLabel = (label: string): boolean => label.startsWith("Monthly salary");

/**
 * A karigar on a salary who leaves before the month is over (backlog P3.19,
 * the client's decision of 2026-10-02): the month's salary for the days they
 * were marked present at Day close — salary × days present ÷ days in the
 * month, rounded once, half up. 30,000 for 12 days of October is 11,613.
 */
export function leaverSalary(salary: Rupees, daysPresent: number, daysInMonth: number): Rupees {
  return Math.round((salary * daysPresent) / daysInMonth);
}

/**
 * "Monthly salary (October 2026): 12 of 31 days present, last day 15 Oct" —
 * still a monthly salary to `isMonthlySalaryLabel`, so no correction or reopen
 * of its day takes it out, and the slip counts it as salary.
 */
export const leaverSalaryLabel = (monthName: string, daysPresent: number, daysInMonth: number, lastDay: string): string =>
  `${monthlySalaryLabel(monthName)}: ${daysPresent} of ${daysInMonth} days present, last day ${lastDay}`;

/** Taken back when the karigar is made active again while that month is open (P3.19). */
export const leaverSalaryTakenBackLabel = (monthName: string): string => `${monthlySalaryLabel(monthName)}: taken back, active again`;

/**
 * A leaver's salary line, or its taking back — a month's salary written when
 * someone was made inactive, not by Month close. The Monthly report adds these
 * to the salaries of the staff still active.
 */
export const isLeaverSalaryLabel = (label: string): boolean => /^Monthly salary \([^)]+\): /.test(label);

export const paysSalary = (type: PayType): boolean => PAY_PARTS[type].salary;
export const paysDailyWage = (type: PayType): boolean => PAY_PARTS[type].dailyWage;
export const paysCommission = (type: PayType): boolean => PAY_PARTS[type].commission;

/**
 * The salary Month close adds to someone's khata, and the Monthly report counts
 * until then: theirs if their pay type has one, otherwise nothing.
 */
export const monthlySalaryOf = (pay: Pick<StaffPay, "payType" | "salary">): number => (paysSalary(pay.payType) ? pay.salary : 0);

/** Zero out the fields a pay type does not use, so stale values never leak into pay. */
export function normalizeStaffPay(pay: StaffPay): StaffPay {
  return {
    payType: pay.payType,
    salary: paysSalary(pay.payType) ? pay.salary : 0,
    dailyWage: paysDailyWage(pay.payType) ? pay.dailyWage : 0,
    commissionRate: paysCommission(pay.payType) ? pay.commissionRate : 0,
  };
}

/**
 * The part of a staff member's pay a day's close works with (P7.13, QA-08):
 * the pay type, and the wage and commission rate only where the type pays
 * them. Never the salary, even when handed a whole `StaffPay`: this is what
 * reaches the browser for Day close.
 */
export function dayPayOf(pay: DayPay): DayPay {
  return {
    payType: pay.payType,
    dailyWage: paysDailyWage(pay.payType) ? pay.dailyWage : 0,
    commissionRate: paysCommission(pay.payType) ? pay.commissionRate : 0,
  };
}
