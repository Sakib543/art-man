"use server";

import { revalidatePath } from "next/cache";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireRole, requireUser } from "@/lib/auth/session";
import { findBillByClientId, findCustomer } from "./queries";
import {
  cancelBillSchema,
  createBillSchema,
  editBillSchema,
  findSavedBillSchema,
  lookupCustomerSchema,
} from "./schemas";
import { cancelBill } from "@/db/bill-cancel";
import { createBill, editBill } from "./service";
import type { CustomerInfo, Receipt, SavedBill } from "./types";

export async function createBillAction(input: unknown): Promise<ActionResult<SavedBill>> {
  const user = await requireUser();
  const parsed = createBillSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid bill" };

  try {
    const saved = await createBill(user, parsed.data);
    revalidatePath("/billing");
    return { ok: true, data: saved };
  } catch (error) {
    return failure(error);
  }
}

/** Correcting a bill of the day that is still open: the Owner's alone (P1.4). */
export async function editBillAction(input: unknown): Promise<ActionResult<SavedBill>> {
  const user = await requireRole("owner");
  const parsed = editBillSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid bill" };

  try {
    const saved = await editBill(user, parsed.data);
    // Not /billing: the screen is still on ?edit=<id> and that bill is now
    // cancelled, so re-rendering it here would swap the screen out mid-save.
    // It navigates away itself, which fetches the page fresh.
    revalidatePath("/daily-report");
    return { ok: true, data: saved };
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

/**
 * Did the bill sent under this id arrive? The billing screen asks when a Save
 * lost its answer on the way back (P3.15): the receipt means it was saved,
 * null means it never was and Save can be pressed again.
 */
export async function findSavedBillAction(input: unknown): Promise<ActionResult<Receipt | null>> {
  await requireUser();
  const parsed = findSavedBillSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  try {
    return { ok: true, data: await findBillByClientId(parsed.data.clientId) };
  } catch (error) {
    return failure(error);
  }
}
