import { z } from "zod";

const rupees = z.number().int("Use whole rupees").min(0, "Cannot be negative").max(1_000_000_000);

/**
 * The id the screen sends this under until it hears the save worked (P7.2):
 * the server saves one id once (`saveOnce`). Optional only so a screen loaded
 * before P7.2 still saves.
 */
const clientId = z.uuid().nullish().transform((value) => value ?? null);

export const addInvestmentSchema = z.object({
  name: z.string().trim().min(1, "Enter a name for the investment").max(80),
  totalCost: rupees.min(1, "Enter the total cost"),
  contributions: z
    .array(z.object({ partnerId: z.uuid(), amount: rupees }))
    .max(20),
  clientId,
});

export const addRepaymentSchema = z.object({
  capitalItemId: z.uuid(),
  partnerId: z.uuid("Choose who was paid"),
  amount: rupees.min(1, "Enter the installment amount"),
  note: z.string().trim().max(120).optional(),
  clientId,
});

export type AddInvestmentInput = z.infer<typeof addInvestmentSchema>;
export type AddRepaymentInput = z.infer<typeof addRepaymentSchema>;
