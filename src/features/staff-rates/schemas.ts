import { z } from "zod";

const rupees = z.number().int("Use whole rupees").min(0, "Cannot be negative").max(10_000_000);

export const staffSchema = z.object({
  /** Present when editing an existing staff member. */
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Enter a name").max(60),
  payType: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  salary: rupees,
  dailyWage: rupees,
  commissionRate: z.number().min(0, "Cannot be negative").max(100, "Commission cannot be more than 100%"),
  active: z.boolean(),
});

export const serviceSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1, "Enter a name").max(60),
    category: z.string().trim().min(1, "Enter a category").max(40),
    /** The price, or the bottom of the range when `maxPrice` is given (P3.11). */
    price: rupees,
    /**
     * The top of the range. Blank means one fixed price, which is what most
     * of the printed list's simpler services are.
     */
    maxPrice: rupees.nullish().transform((value) => value ?? null),
    minutes: z.number().int().min(1).max(600).nullable(),
    active: z.boolean(),
  })
  // "300 - 500", never "500 - 300" and never "400 - 400": a range that is not
  // a range would give the counter a box with nothing to decide.
  .refine((service) => service.maxPrice === null || service.maxPrice > service.price, {
    path: ["maxPrice"],
    error: "The highest price must be more than the lowest",
  });

export const dealSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Enter a name").max(60),
  price: rupees.min(1, "Enter the deal price"),
  serviceIds: z.array(z.uuid()).min(2, "A deal needs at least two services").max(20),
  active: z.boolean(),
});

export type StaffInput = z.infer<typeof staffSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type DealInput = z.infer<typeof dealSchema>;
