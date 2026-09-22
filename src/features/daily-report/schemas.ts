import { z } from "zod";

export const cancelClosedBillSchema = z.object({
  billId: z.uuid(),
  reason: z.string().trim().min(3, "Write a reason for cancelling").max(200),
});
