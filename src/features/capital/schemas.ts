import { z } from "zod";

const rupees = z.number().int("Use whole rupees").min(0, "Cannot be negative").max(1_000_000_000);

export const addInvestmentSchema = z.object({
  name: z.string().trim().min(1, "Enter a name for the investment").max(80),
  totalCost: rupees.min(1, "Enter the total cost"),
  contributions: z
    .array(z.object({ partnerId: z.uuid(), amount: rupees }))
    .max(20),
});

export const addRepaymentSchema = z.object({
  capitalItemId: z.uuid(),
  partnerId: z.uuid("Choose who was paid"),
  amount: rupees.min(1, "Enter the installment amount"),
  note: z.string().trim().max(120).optional(),
});

export type AddInvestmentInput = z.infer<typeof addInvestmentSchema>;
export type AddRepaymentInput = z.infer<typeof addRepaymentSchema>;
