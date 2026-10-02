import { z } from "zod";

const rupees = z.number().int("Use whole rupees").min(0, "Cannot be negative").max(10_000_000);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");

export const staffSchema = z.object({
  /** Present when editing an existing staff member. */
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Enter a name").max(60),
  payType: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  salary: rupees,
  dailyWage: rupees,
  commissionRate: z.number().min(0, "Cannot be negative").max(100, "Commission cannot be more than 100%"),
  /**
   * Rupees for an hour of overtime (P3.18), whatever the pay type; 0 = none.
   * Left out — a form loaded before P3.18 — it stays as it is.
   */
  overtimeRate: rupees.optional(),
  active: z.boolean(),
  /**
   * Their last working day, when this Save makes a karigar on a salary
   * inactive (P3.19): their salary is paid up to it, for the days present.
   */
  lastDay: isoDate.optional(),
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

/** What the form asks before making a karigar inactive (P3.19). */
export const leaverPreviewSchema = z.object({
  staffId: z.uuid(),
  lastDay: isoDate,
});

export type StaffInput = z.infer<typeof staffSchema>;
export type LeaverPreviewInput = z.infer<typeof leaverPreviewSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type DealInput = z.infer<typeof dealSchema>;
