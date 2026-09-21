"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import { findCustomer } from "./queries";
import { cancelBillSchema, createBillSchema, lookupCustomerSchema } from "./schemas";
import { cancelBill, createBill } from "./service";
import type { ActionResult, CustomerInfo, Receipt } from "./types";

/** Turn a thrown error into a result the screen can show. Real bugs stay generic. */
function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof UserError) return { ok: false, error: error.message };
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function createBillAction(input: unknown): Promise<ActionResult<Receipt>> {
  const user = await requireUser();
  const parsed = createBillSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid bill" };

  try {
    const receipt = await createBill(user, parsed.data);
    revalidatePath("/billing");
    return { ok: true, data: receipt };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelBillAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireUser();
  const parsed = cancelBillSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };

  try {
    await cancelBill(user, parsed.data.billId, parsed.data.reason);
    revalidatePath("/billing");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

/** Look up a customer by phone. Returns null data when the number is new. */
export async function lookupCustomerAction(input: unknown): Promise<ActionResult<CustomerInfo | null>> {
  await requireUser();
  const parsed = lookupCustomerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid mobile number" };

  try {
    return { ok: true, data: await findCustomer(parsed.data.phone) };
  } catch (error) {
    return failure(error);
  }
}
