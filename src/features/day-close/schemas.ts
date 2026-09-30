import { z } from "zod";
import { deviceTagSchema } from "@/lib/offline/device";

const rupees = z.number().int("Use whole rupees").min(0, "Cannot be negative").max(100_000_000);
const attendance = z.record(z.uuid(), z.boolean());
/** Cash handed to each staff member at close. Staff PINs were removed, so no confirmation. */
const payouts = z.record(z.uuid(), rupees);
const reason = z.string().trim().max(300, "Keep the reason to 300 characters");

/**
 * The id the Day Close screen gives a close before sending it (P2.2f), as
 * billing does a bill (P3.15): the server's `day.close` audit entry keeps it,
 * so a close sent again — after its answer was lost, or by the outbox — never
 * closes a day twice. Optional only so a screen loaded before P2.2f still closes.
 */
const clientId = z.uuid().nullish().transform((value) => value ?? null);

export const reviewSchema = z.object({
  attendance,
  payouts,
  counted: rupees,
});

export const closeSchema = z.object({
  attendance,
  payouts,
  counted: rupees,
  reason: reason.optional(),
  clientId,
});

export const reopenSchema = z.object({
  reason: z.string().trim().min(3, "Write why the day is being reopened").max(300),
});

export const openFirstDaySchema = z.object({
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  openingCash: rupees,
});

/**
 * A day closed on the counter while the server could not be reached, sent
 * later by the outbox (P2.2f; `lib/offline/outbox.ts`). `businessDate` never
 * chooses the day that is closed — it only refuses the wrong one — and
 * `expected` is what the count was compared with: the server closes the day
 * only if its own books come to the same.
 */
export const syncCloseSchema = z.object({
  v: z.literal(1, { error: "This close was kept by a version of the app this server no longer reads" }),
  type: z.literal("close"),
  clientId: z.uuid(),
  businessDate: z.iso.date(),
  madeAt: z.iso.datetime(),
  madeBy: z.string().trim().max(80),
  /** The computer it was closed on (P7.10); none on a close kept before P7.10. */
  device: deviceTagSchema.optional(),
  close: z.object({
    attendance,
    payouts,
    counted: rupees,
    reason: reason.nullable(),
    // Expected cash can come out below zero on a day that paid out more than it took.
    expected: z.number().int().min(-100_000_000).max(100_000_000),
  }),
});

/**
 * Taking a refused offline close off the counter's list (P2.2f). The reason
 * is the control, as for a refused bill or entry; the close as the counter
 * kept it goes to the audit log — recorded, never trusted, so any shape is
 * accepted, up to a size.
 */
export const discardOfflineCloseSchema = z.object({
  clientId: z.uuid(),
  reason: z.string().trim().min(3, "Write why this close is being removed").max(200),
  close: z
    .record(z.string(), z.unknown())
    .refine((close) => JSON.stringify(close).length <= 20_000, { error: "That close is too large to record" }),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
export type CloseInput = z.infer<typeof closeSchema>;
export type SyncCloseInput = z.infer<typeof syncCloseSchema>;
/** Where an offline close came from: everything the sync sends besides the close's own figures. */
export type OfflineCloseOrigin = Pick<SyncCloseInput, "businessDate" | "madeAt" | "madeBy" | "device"> & { expected: number };
export type DiscardOfflineCloseInput = z.infer<typeof discardOfflineCloseSchema>;
