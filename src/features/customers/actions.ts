"use server";

import { revalidatePath } from "next/cache";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/session";
import { editCustomerSchema, removeRateSchema, setRateSchema } from "./schemas";
import { editCustomer, removeSpecialRate, setSpecialRate } from "./service";

const firstIssue = (error: { issues: { message: string }[] }, fallback: string) =>
  error.issues[0]?.message ?? fallback;

/**
 * All three are the Owner's. Spec §10.4 keeps rates out of the counter's hands,
 * and the name and phone go with them rather than living under a second rule.
 * `requireRole` is outside the try, because it redirects.
 */
export async function editCustomerAction(input: unknown): Promise<ActionResult<null>> {
  const actor = await requireRole("owner");
  const parsed = editCustomerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Check the details") };

  try {
    await editCustomer(actor, parsed.data);
    revalidatePath("/customers");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function setRateAction(input: unknown): Promise<ActionResult<null>> {
  const actor = await requireRole("owner");
  const parsed = setRateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Check the price") };

  try {
    await setSpecialRate(actor, parsed.data);
    revalidatePath("/customers");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function removeRateAction(input: unknown): Promise<ActionResult<null>> {
  const actor = await requireRole("owner");
  const parsed = removeRateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Check the service") };

  try {
    await removeSpecialRate(actor, parsed.data);
    revalidatePath("/customers");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
