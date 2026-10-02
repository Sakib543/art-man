import type { DayPay, PayType, StaffPay } from "./types";

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
