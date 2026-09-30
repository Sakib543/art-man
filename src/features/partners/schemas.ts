import { z } from "zod";

const month = z.string().regex(/^\d{4}-\d{2}$/, "Choose a month");

/**
 * The id the screen sends this under until it hears the save worked (P7.2):
 * the server saves one id once (`saveOnce`). Optional only so a screen loaded
 * before P7.2 still saves.
 */
const clientId = z.uuid().nullish().transform((value) => value ?? null);

export const saveSharesSchema = z.object({
  partners: z
    .array(
      z.object({
        id: z.uuid(),
        name: z.string().trim().min(1, "Every partner needs a name").max(60),
        sharePct: z.number().min(0, "A share cannot be negative").max(100, "A share cannot be more than 100%"),
      }),
    )
    .min(1)
    .max(20),
});

export const addPartnerSchema = z.object({ name: z.string().trim().min(1, "Enter a name").max(60) });

export const addDrawingSchema = z.object({
  partnerId: z.uuid(),
  month,
  amount: z.number().int("Use whole rupees").min(1, "Enter an amount").max(1_000_000_000),
  note: z.string().trim().max(120).optional(),
  clientId,
});

export const voidDrawingSchema = z.object({
  drawingId: z.uuid(),
  reason: z.string().trim().min(3, "Write a reason for cancelling").max(200),
});

export type AddDrawingInput = z.infer<typeof addDrawingSchema>;
