import { z } from "zod";

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().max(128),
});

export const resetPinSchema = z.object({
  userId: z.string().min(1),
  newPin: z.string().regex(/^\d{4}$/, "The PIN must be exactly 4 digits"),
});

export const maintenanceSchema = z.object({
  on: z.boolean(),
});

export const editBillRowSchema = z.object({
  billNo: z.number().int().positive(),
  lines: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(120),
        amount: z.number().int(),
        staffId: z.string().min(1),
      }),
    )
    .min(1),
  cash: z.number().int(),
  online: z.number().int(),
  bookNo: z
    .string()
    .trim()
    .max(40)
    .nullish()
    // A blank book number is stored as null, never "", so "no paper bill" and
    // "blank slip" do not look the same.
    .transform((value) => (value ? value : null)),
  reason: z.string().trim().min(3, "Say why this bill is being changed (at least 3 characters)").max(300),
});

export type EditBillRowInput = z.infer<typeof editBillRowSchema>;
