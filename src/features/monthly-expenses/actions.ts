"use server";

import { revalidatePath } from "next/cache";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/session";
import { addFixedLineSchema, addOtherSchema, setFixedSchema, voidOtherSchema } from "./schemas";
import { addFixedLine, addOther, setFixedAmount, voidOther } from "./service";

// Monthly expenses are Owner only (see the spec, section 2).

const firstIssue = (error: { issues: { message: string }[] }, fallback: string) => error.issues[0]?.message ?? fallback;

function refresh() {
  revalidatePath("/monthly-expenses");
  revalidatePath("/monthly-report");
}

export async function setFixedAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = setFixedSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid amount") };
  try {
    await setFixedAmount(user, parsed.data);
    refresh();
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function addFixedLineAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = addFixedLineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid line") };
  try {
    await addFixedLine(user, parsed.data.name, parsed.data.paidByOwner);
    refresh();
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function addOtherAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = addOtherSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid expense") };
  try {
    await addOther(user, parsed.data);
    refresh();
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function voidOtherAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = voidOtherSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid request") };
  try {
    await voidOther(user, parsed.data.entryId, parsed.data.reason);
    refresh();
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
