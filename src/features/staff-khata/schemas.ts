import { z } from "zod";

/**
 * Giving a bonus (backlog P3.1, spec §10.10: the Owner alone may give one).
 * The same schema validates the dialog and the Server Action.
 */
export const bonusSchema = z.object({
  staffId: z.uuid("Choose a staff member"),
  amount: z.number().int("Use whole rupees").min(1, "Enter an amount").max(1_000_000),
  reason: z.string().trim().min(3, "Say what the bonus is for").max(120),
});

export type BonusInput = z.infer<typeof bonusSchema>;
