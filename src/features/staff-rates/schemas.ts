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
  /** Required for a new staff member. When editing, blank keeps the current PIN. */
  pin: z.string().trim().optional(),
  active: z.boolean(),
});

export const serviceSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Enter a name").max(60),
  category: z.string().trim().min(1, "Enter a category").max(40),
  price: rupees,
  minutes: z.number().int().min(1).max(600).nullable(),
  active: z.boolean(),
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
