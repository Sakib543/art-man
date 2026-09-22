import { z } from "zod";
import { ROLES } from "@/lib/auth/roles";

/**
 * A username is what someone types at 7am on a counter tablet, so it is kept
 * narrow on purpose: lowercase letters, digits and a few separators. It is
 * also half of the account's email (`<username>@art-man.local`), which Better
 * Auth requires and nobody ever reads.
 */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "The username needs at least 3 characters")
  .max(32, "The username can be at most 32 characters")
  .regex(/^[a-z0-9._-]+$/, "Use only letters, digits, dots, dashes and underscores");

export const createUserSchema = z.object({
  username: usernameSchema,
  name: z.string().trim().min(2, "Write the person's name").max(80),
  role: z.enum(ROLES),
  password: z.string().max(128),
});

export const resetUserPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().max(128),
});

export const setUserActiveSchema = z.object({
  userId: z.string().min(1),
  active: z.boolean(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
