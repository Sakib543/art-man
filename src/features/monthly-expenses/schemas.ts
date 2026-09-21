import { z } from "zod";

const month = z.string().regex(/^\d{4}-\d{2}$/, "Choose a month");
const amount = z.number().int("Use whole rupees").min(1, "Enter an amount").max(100_000_000);

export const setFixedSchema = z.object({
  month,
  lineId: z.uuid(),
  /** The month's total for this line. 0 is allowed: it clears the line. */
  amount: z.number().int("Use whole rupees").min(0, "Cannot be negative").max(100_000_000),
});

export const addFixedLineSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(60),
  paidByOwner: z.boolean(),
});

export const addOtherSchema = z.object({
  month,
  reason: z.string().trim().min(3, "Write a reason for the expense").max(200),
  amount,
  paidFrom: z.enum(["drawer", "owner"]),
});

export const voidOtherSchema = z.object({
  entryId: z.uuid(),
  reason: z.string().trim().min(3, "Write a reason for cancelling").max(200),
});

export type SetFixedInput = z.infer<typeof setFixedSchema>;
export type AddOtherInput = z.infer<typeof addOtherSchema>;
