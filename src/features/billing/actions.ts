"use server";

import { revalidatePath } from "next/cache";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireRole, requireUser } from "@/lib/auth/session";
import { findCustomer } from "./queries";
import { cancelBillSchema, createBillSchema, editBillSchema, lookupCustomerSchema } from "./schemas";
import { cancelBill } from "@/db/bill-cancel";
import { createBill, editBill } from "./service";
import type { CustomerInfo, Receipt } from "./types";

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

/** Correcting a bill of the day that is still open: the Owner's alone (P1.4). */
export async function editBillAction(input: unknown): Promise<ActionResult<Receipt>> {
  const user = await requireRole("owner");
  const parsed = editBillSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid bill" };

  try {
    const receipt = await editBill(user, parsed.data);
    // Not /billing: the screen is still on ?edit=<id> and that bill is now
    // cancelled, so re-rendering it here would swap the screen out mid-save.
    // It navigates away itself, which fetches the page fresh.
    revalidatePath("/daily-report");
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
