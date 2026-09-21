import { z } from "zod";

const rupees = z.number().int("Use whole rupees").min(0, "Cannot be negative").max(100_000_000);
const attendance = z.record(z.uuid(), z.boolean());
/** Cash handed to each staff member at close. Staff PINs were removed, so no confirmation. */
const payouts = z.record(z.uuid(), rupees);

export const reviewSchema = z.object({
  attendance,
  payouts,
  counted: rupees,
});

export const closeSchema = z.object({
  attendance,
  payouts,
  counted: rupees,
  reason: z.string().trim().max(300).optional(),
});

export const openFirstDaySchema = z.object({
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  openingCash: rupees,
});

export type ReviewInput = z.infer<typeof reviewSchema>;
export type CloseInput = z.infer<typeof closeSchema>;
