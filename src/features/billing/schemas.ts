import { z } from "zod";

const rupees = z.number().int().min(0).max(10_000_000);

/**
 * The number written on the paper bill book, used when power or internet was
 * down and the bill was written by hand first (spec 5.5). Blank means the bill
 * was rung up here, so it is stored as null rather than an empty string.
 */
const bookNo = z
  .string()
  .trim()
  .max(20, "Bill book number can be at most 20 characters")
  .nullish()
  .transform((value) => value || null);

/**
 * Money off the bill (backlog P3.10). Whole rupees on the whole bill; the
 * Manager may give one as well as the Owner, which is the client's decision of
 * 2026-09-23 and the opposite of what spec §10.4 says. `priceCart` is what
 * refuses a discount bigger than the bill — it is the only place that knows
 * what the services actually came to.
 */
const discount = rupees;

/**
 * The id the billing screen gives a bill before sending it (P3.15), so a Save
 * whose answer was lost can be asked about and sent again without making a
 * second bill. Optional only so a screen loaded before P3.15 still saves; it
 * just cannot be asked about.
 */
const clientId = z.uuid().nullish().transform((value) => value ?? null);

export const createBillSchema = z
  .object({
    lines: z
      .array(
        z
          .object({
            /** Null on an "Other" line (P3.12), which has no service behind it. */
            serviceId: z.uuid().nullable(),
            staffId: z.uuid({ error: "Choose a staff member for every service" }),
            dealId: z.uuid().nullable(),
            dealInstanceId: z.string().min(1).max(64).nullable(),
            /**
             * What the counter chose for a service that has a price range
             * (P3.11). `priceCart` is what checks it against the range, and
             * ignores it entirely for a fixed price, a deal share or a special
             * rate — an amount from the browser is never taken on trust.
             *
             * On an "Other" line it *is* the price (P3.12).
             */
            amount: rupees.nullish().transform((value) => value ?? null),
            /** What an "Other" line was for. Optional — the client's call. */
            description: z
              .string()
              .trim()
              .max(60, "Keep what Other was for to 60 characters")
              .nullish()
              .transform((value) => value || null),
          })
          // The screen prices a blank Other as 0 so the total stays live while
          // it is typed; this is what stops one being saved.
          .refine((line) => line.serviceId !== null || (line.amount ?? 0) >= 1, {
            path: ["amount"],
            error: "Enter the amount for Other",
          }),
      )
      .min(1, "Add a service or deal to start the bill")
      .max(40),
    customer: z
      .object({
        phone: z.string().trim().min(7).max(20),
        name: z.string().trim().max(80).optional(),
      })
      .nullable(),
    cash: rupees,
    online: rupees,
    bookNo,
    clientId,
    discount: discount.default(0),
    /** Why money was taken off. Required as soon as there is a discount. */
    discountReason: z.string().trim().max(120).nullish().transform((value) => value || null),
  })
  // A discount is money leaving the business at the counter's discretion, which
  // is exactly what the spec did not want. The reason is the control that
  // replaces the rule, and it protects whoever gave it just as much.
  .refine((bill) => bill.discount === 0 || (bill.discountReason?.length ?? 0) >= 3, {
    path: ["discountReason"],
    error: "Say why the discount is being given",
  });

/**
 * The Owner correcting a bill of the open day (P1.4). Same shape as a new
 * bill, plus which bill it replaces and why.
 */
export const editBillSchema = z.intersection(
  createBillSchema,
  z.object({
    billId: z.uuid(),
    reason: z.string().trim().min(3, "Write what was wrong with the bill").max(200),
  }),
);

export const cancelBillSchema = z.object({
  billId: z.uuid(),
  reason: z.string().trim().min(3, "Write a reason for cancelling").max(200),
});

export const lookupCustomerSchema = z.object({
  phone: z.string().trim().min(7).max(20),
});

/** "Did the bill sent under this id arrive?" (P3.15) */
export const findSavedBillSchema = z.object({
  clientId: z.uuid(),
});

/**
 * A bill the counter made while the server could not be reached, sent later
 * by the sync (P2.2c; `lib/offline/outbox.ts`). The bill is exactly what the
 * billing screen sends; around it, what the browser knew when it made it.
 * `businessDate` never chooses the day a bill goes into — it only refuses the
 * wrong one.
 */
export const syncBillSchema = z.object({
  v: z.literal(1, { error: "This bill was kept by a version of the app this server no longer reads" }),
  clientId: z.uuid(),
  businessDate: z.iso.date(),
  catalogVersion: z.string().max(128).nullable(),
  madeAt: z.iso.datetime(),
  madeBy: z.string().trim().max(80),
  bill: createBillSchema,
});

/**
 * Taking a refused offline bill off the counter's list (P2.2c). The reason is
 * the control, as it is for a cancellation. The bill as the counter kept it
 * goes to the audit log, since the server never had it any other way; it is
 * recorded, never trusted, so any shape is accepted — up to a size.
 */
export const discardOfflineBillSchema = z.object({
  clientId: z.uuid(),
  reason: z.string().trim().min(3, "Write why this bill is being removed").max(200),
  entry: z
    .record(z.string(), z.unknown())
    .refine((entry) => JSON.stringify(entry).length <= 20_000, { error: "That bill is too large to record" }),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type EditBillInput = z.infer<typeof editBillSchema>;
export type SyncBillInput = z.infer<typeof syncBillSchema>;
/** Where an offline bill came from: everything the sync sends besides the bill and its id. */
export type OfflineOrigin = Pick<SyncBillInput, "businessDate" | "catalogVersion" | "madeAt" | "madeBy">;
export type DiscardOfflineBillInput = z.infer<typeof discardOfflineBillSchema>;
