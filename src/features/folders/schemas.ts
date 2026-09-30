import { z } from "zod";

const amount = z.number().int("Use whole rupees").min(1, "Enter an amount").max(10_000_000);
/** Only the Owner's own cash movements are confirmed with a PIN. Staff PINs were removed. */
const pin = z.string().regex(/^\d{4}$/, "Enter the 4-digit PIN");
const text = (message: string) => z.string().trim().min(1, message).max(120);

/**
 * The id the Daily folders screen gives an entry before sending it (P2.2e),
 * as billing does for a bill (P3.15): the server saves one id once, so an
 * entry sent again — after its answer was lost, or by the outbox — is never
 * saved twice. Optional only so a screen loaded before P2.2e still saves.
 */
const clientId = z.uuid().nullish().transform((value) => value ?? null);

const expense = z.object({
  kind: z.literal("expense"),
  amount,
  description: text("Say what the expense was for"),
  paidFrom: z.enum(["drawer", "owner"]),
});

const staffAdvance = z.object({
  kind: z.literal("staff_advance"),
  amount,
  staffId: z.uuid("Choose a staff member"),
});

export const entrySchema = z.discriminatedUnion("kind", [
  expense.extend({ clientId }),
  staffAdvance.extend({ clientId }),
  z.object({
    kind: z.literal("owner_took"),
    amount,
    description: text("Say what the cash is for"),
    pin,
    clientId,
  }),
  z.object({
    kind: z.literal("owner_added"),
    amount,
    description: text("Say what the cash is for"),
    pin,
    clientId,
  }),
]);

export const voidSchema = z.object({
  entryId: z.uuid(),
  reason: z.string().trim().min(3, "Write a reason for cancelling").max(200),
  /** The Owner's cash is cancelled only with the Owner's PIN (P7.1); `voidEntry` asks for it. Nothing else takes one. */
  pin: pin.optional(),
});

/**
 * A folder entry the counter made while the server could not be reached,
 * sent later by the outbox (P2.2e; `lib/offline/outbox.ts`). Only an expense
 * or a staff advance: the Owner's own cash needs the Owner's PIN, which the
 * device never keeps. `businessDate` never chooses the day an entry goes into
 * — it only refuses the wrong one.
 */
export const syncEntrySchema = z.object({
  v: z.literal(1, { error: "This entry was kept by a version of the app this server no longer reads" }),
  type: z.literal("folder"),
  clientId: z.uuid(),
  businessDate: z.iso.date(),
  madeAt: z.iso.datetime(),
  madeBy: z.string().trim().max(80),
  entry: z.discriminatedUnion("kind", [expense, staffAdvance], {
    error: "Only an expense or a staff advance can be made offline",
  }),
});

/**
 * Taking a refused offline entry off the counter's list (P2.2e). The reason
 * is the control, as it is for a cancellation; the entry as the counter kept
 * it goes to the audit log — recorded, never trusted, so any shape is
 * accepted, up to a size.
 */
export const discardOfflineEntrySchema = z.object({
  clientId: z.uuid(),
  reason: z.string().trim().min(3, "Write why this entry is being removed").max(200),
  entry: z
    .record(z.string(), z.unknown())
    .refine((entry) => JSON.stringify(entry).length <= 20_000, { error: "That entry is too large to record" }),
});

export type EntryInput = z.infer<typeof entrySchema>;
export type SyncEntryInput = z.infer<typeof syncEntrySchema>;
/** Where an offline entry came from: everything the sync sends besides the entry and its id. */
export type OfflineEntryOrigin = Pick<SyncEntryInput, "businessDate" | "madeAt" | "madeBy">;
export type DiscardOfflineEntryInput = z.infer<typeof discardOfflineEntrySchema>;
export type VoidInput = z.infer<typeof voidSchema>;
