import { z } from "zod";
import type { AdjustmentKind } from "@/lib/accounting";

/**
 * Recording and cancelling an adjustment for a closed month (backlog P3.4).
 * The same schemas validate the dialogs and the Server Actions.
 */

export const ADJUSTMENT_KINDS = ["sale", "expense", "staff_earning", "staff_taken"] as const satisfies readonly AdjustmentKind[];

const STAFF_KINDS: readonly string[] = ["staff_earning", "staff_taken"];

/**
 * The id the screen sends this under until it hears the save worked (P7.2):
 * the server saves one id once (`saveOnce`). Optional only so a screen loaded
 * before P7.2 still saves.
 */
const clientId = z.uuid().nullish().transform((value) => value ?? null);

export const recordAdjustmentSchema = z
  .object({
    /** The closed month it corrects, "2026-09". */
    correctsMonth: z.string().regex(/^\d{4}-\d{2}$/, "Choose a month"),
    kind: z.enum(ADJUSTMENT_KINDS, "Choose what was wrong"),
    /** Should the closed month's figure have been more than recorded, or less? */
    direction: z.enum(["more", "less"], "Choose more or less"),
    amount: z.number().int("Use whole rupees").min(1, "Enter the amount").max(100_000_000),
    /** A sale: paid online? Sent always, kept only for a sale. */
    online: z.boolean(),
    /** An expense: who paid it. Sent always, kept only for an expense. */
    paidFrom: z.enum(["drawer", "owner"]),
    /** Staff pay only. */
    staffId: z.uuid("Choose a staff member").optional(),
    reason: z.string().trim().min(3, "Say what was wrong").max(200),
    clientId,
  })
  .refine((input) => !STAFF_KINDS.includes(input.kind) || input.staffId !== undefined, {
    path: ["staffId"],
    error: "Choose a staff member",
  });

export const cancelAdjustmentSchema = z.object({
  adjustmentId: z.uuid(),
  reason: z.string().trim().min(3, "Say why it is being cancelled").max(200),
});

export type RecordAdjustmentInput = z.infer<typeof recordAdjustmentSchema>;
export type CancelAdjustmentInput = z.infer<typeof cancelAdjustmentSchema>;
