import { z } from "zod";

/** The same shape billing uses, so a number saved on one screen is valid on the other. */
const phone = z.string().trim().min(7, "Enter the phone number").max(20);
const name = z.string().trim().min(2, "Enter the customer's name").max(80);

/** Spec §11: a customer's name and phone are the only things that may be edited. */
export const editCustomerSchema = z.object({ id: z.uuid(), name, phone });

export const setRateSchema = z.object({
  customerId: z.uuid(),
  serviceId: z.uuid("Choose a service"),
  price: z.number().int("Use whole rupees").min(0, "Enter a price").max(1_000_000),
});

export const removeRateSchema = z.object({ customerId: z.uuid(), serviceId: z.uuid() });

export type EditCustomerInput = z.infer<typeof editCustomerSchema>;
export type SetRateInput = z.infer<typeof setRateSchema>;
export type RemoveRateInput = z.infer<typeof removeRateSchema>;
