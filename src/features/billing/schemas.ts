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

export const createBillSchema = z
  .object({
    lines: z
      .array(
        z.object({
          serviceId: z.uuid(),
          staffId: z.uuid({ error: "Choose a staff member for every service" }),
          dealId: z.uuid().nullable(),
          dealInstanceId: z.string().min(1).max(64).nullable(),
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

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type EditBillInput = z.infer<typeof editBillSchema>;
