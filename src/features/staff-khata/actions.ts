"use server";

import { revalidatePath } from "next/cache";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/session";
import { bonusSchema, cancelLineSchema, deductionSchema, overtimeSchema } from "./schemas";
import { addDeduction, addOvertime, cancelKhataLine, giveBonus } from "./service";

export async function giveBonusAction(input: unknown): Promise<ActionResult<null>> {
  // Spec §10.10: only the Owner gives bonuses. `requireRole` lets the developer
  // through, as everywhere else. It is outside the try: it redirects.
  const actor = await requireRole("owner");
  const parsed = bonusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };

  try {
    await giveBonus(actor, parsed.data);
    revalidatePath("/staff-khata");
    revalidatePath("/monthly-report");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

// Overtime and deductions (backlog P3.18): the Owner and the Manager both, the
// client's decision of 2026-10-02 — unlike a bonus. Cancelling one is the
// Owner's alone.

export async function addOvertimeAction(input: unknown): Promise<ActionResult<null>> {
  const actor = await requireRole("owner", "manager");
  const parsed = overtimeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };

  try {
    await addOvertime(actor, parsed.data);
    revalidatePath("/staff-khata");
    revalidatePath("/monthly-report");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function addDeductionAction(input: unknown): Promise<ActionResult<null>> {
  const actor = await requireRole("owner", "manager");
  const parsed = deductionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };

  try {
    await addDeduction(actor, parsed.data);
    revalidatePath("/staff-khata");
    revalidatePath("/monthly-report");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelKhataLineAction(input: unknown): Promise<ActionResult<null>> {
  const actor = await requireRole("owner");
  const parsed = cancelLineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };

  try {
    await cancelKhataLine(actor, parsed.data);
    revalidatePath("/staff-khata");
    revalidatePath("/monthly-report");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
