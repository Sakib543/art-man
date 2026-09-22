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

export const createBillSchema = z.object({
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
});

export const cancelBillSchema = z.object({
  billId: z.uuid(),
  reason: z.string().trim().min(3, "Write a reason for cancelling").max(200),
});

export const lookupCustomerSchema = z.object({
  phone: z.string().trim().min(7).max(20),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
