import { z } from "zod";

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(128),
  newPassword: z.string().max(128),
});

export const changePinSchema = z.object({
  password: z.string().min(1, "Enter your account password to confirm").max(128),
  newPin: z.string().regex(/^\d{4}$/, "The PIN must be exactly 4 digits"),
});

