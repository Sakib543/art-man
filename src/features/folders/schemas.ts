import { z } from "zod";

const amount = z.number().int("Use whole rupees").min(1, "Enter an amount").max(10_000_000);
/** Only the Owner's own cash movements are confirmed with a PIN. Staff PINs were removed. */
const pin = z.string().regex(/^\d{4}$/, "Enter the 4-digit PIN");
const text = (message: string) => z.string().trim().min(1, message).max(120);

export const entrySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("expense"),
    amount,
    description: text("Say what the expense was for"),
    paidFrom: z.enum(["drawer", "owner"]),
  }),
  z.object({
    kind: z.literal("staff_advance"),
    amount,
    staffId: z.uuid("Choose a staff member"),
  }),
  z.object({
    kind: z.literal("owner_took"),
    amount,
    description: text("Say what the cash is for"),
    pin,
  }),
  z.object({
    kind: z.literal("owner_added"),
    amount,
    description: text("Say what the cash is for"),
    pin,
  }),
]);

export const voidSchema = z.object({
  entryId: z.uuid(),
  reason: z.string().trim().min(3, "Write a reason for cancelling").max(200),
});

export type EntryInput = z.infer<typeof entrySchema>;
