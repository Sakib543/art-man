import { z } from "zod";
import { hasHourDecimals } from "@/lib/accounting";

/**
 * The id the screen sends this under until it hears the save worked (P7.2):
 * the server saves one id once (`saveOnce`). Optional only so a screen loaded
 * before P7.2 still saves.
 */
const clientId = z.uuid().nullish().transform((value) => value ?? null);

/**
 * Giving a bonus (backlog P3.1, spec §10.10: the Owner alone may give one).
 * The same schema validates the dialog and the Server Action.
 */
export const bonusSchema = z.object({
  staffId: z.uuid("Choose a staff member"),
  amount: z.number().int("Use whole rupees").min(1, "Enter an amount").max(1_000_000),
  reason: z.string().trim().min(3, "Say what the bonus is for").max(120),
  clientId,
});

export type BonusInput = z.infer<typeof bonusSchema>;

/**
 * Overtime (backlog P3.18): hours only. The rupees are the hours at the
 * karigar's own rate, worked out on the server from the staff row — never sent.
 */
export const overtimeSchema = z.object({
  staffId: z.uuid("Choose a staff member"),
  hours: z
    .number("Enter the hours")
    .positive("Enter the hours")
    .max(24, "No more than 24 hours at once")
    .refine(hasHourDecimals, "Use at most two decimals, e.g. 1.5 or 2.25"),
  reason: z.string().trim().min(3, "Say what the overtime was for").max(120),
  clientId,
});

export type OvertimeInput = z.infer<typeof overtimeSchema>;

/** A deduction (P3.18): rupees taken off the khata, and why. */
export const deductionSchema = z.object({
  staffId: z.uuid("Choose a staff member"),
  amount: z.number().int("Use whole rupees").min(1, "Enter an amount").max(1_000_000),
  reason: z.string().trim().min(3, "Say what the deduction is for").max(120),
  clientId,
});

export type DeductionInput = z.infer<typeof deductionSchema>;

/** The Owner cancels overtime or a deduction (P3.18), saying why. */
export const cancelLineSchema = z.object({
  entryId: z.uuid("Choose a line"),
  reason: z.string().trim().min(3, "Say why it is cancelled").max(120),
});

export type CancelLineInput = z.infer<typeof cancelLineSchema>;

/** Which salary slip to make (backlog P3.3): whose, and for which month ("2026-09"). */
export const slipQuerySchema = z.object({
  staff: z.uuid("Choose a staff member"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Choose a month"),
});
