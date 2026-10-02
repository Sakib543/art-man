"use server";

import { revalidatePath } from "next/cache";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/session";
import type { LeaverSettlement } from "./leaver";
import { dealSchema, leaverPreviewSchema, serviceSchema, staffSchema } from "./schemas";
import { previewLeaver, saveDeal, saveService, saveStaff } from "./service";

// Only the Owner can change staff, prices and deals (see the spec, section 2).

export async function saveStaffAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid staff details" };

  try {
    await saveStaff(user, parsed.data);
    revalidatePath("/staff-rates");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function saveServiceAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid service" };

  try {
    await saveService(user, parsed.data);
    revalidatePath("/staff-rates");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function saveDealAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid deal" };

  try {
    await saveDeal(user, parsed.data);
    revalidatePath("/staff-rates");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

/** What making a karigar inactive would settle (P3.19), for the form to show before the Save. Writes nothing. */
export async function previewLeaverAction(input: unknown): Promise<ActionResult<{ settlement: LeaverSettlement; salary: number }>> {
  await requireRole("owner");
  const parsed = leaverPreviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Choose a date" };

  try {
    return { ok: true, data: await previewLeaver(parsed.data) };
  } catch (error) {
    return failure(error);
  }
}
