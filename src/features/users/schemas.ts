import { z } from "zod";
import { ROLES } from "@/lib/auth/roles";
import { checkUsername } from "@/lib/auth/username-rules";

/**
 * A username is what someone types at 7am on a counter tablet, so it is kept
 * narrow on purpose: letters, digits, a dot and an underscore — the rules in
 * `lib/auth/username-rules.ts`, which Better Auth checks too, at sign-up and
 * at sign-in (P7.17, QA-21: a hyphen used to pass here and be refused there as
 * "Something went wrong"). Stored in lower case. It is also half of the
 * account's email (`<username>@art-man.local`), which Better Auth requires
 * and nobody ever reads.
 */
export const usernameSchema = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    const problem = checkUsername(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  })
  .transform((value) => value.toLowerCase());

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
