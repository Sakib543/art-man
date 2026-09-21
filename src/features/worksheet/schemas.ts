import { z } from "zod";

export const quickAddSchema = z.object({
  staffId: z.uuid("Choose a staff member"),
  amount: z.number().int("Use whole rupees").min(1, "Enter an amount").max(1_000_000),
  payMode: z.enum(["cash", "online"]),
});

export type QuickAddInput = z.infer<typeof quickAddSchema>;
