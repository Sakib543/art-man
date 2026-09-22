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
