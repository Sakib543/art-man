"use server";

import { revalidatePath } from "next/cache";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/session";
import { addDrawingSchema, addPartnerSchema, saveSharesSchema, voidDrawingSchema } from "./schemas";
import { addDrawing, addPartner, saveShares, voidDrawing } from "./service";

// Partner accounts are Owner only (see the spec, section 2).

const firstIssue = (error: { issues: { message: string }[] }, fallback: string) => error.issues[0]?.message ?? fallback;

function refresh() {
  for (const path of ["/partners", "/capital", "/monthly-report"]) revalidatePath(path);
}

export async function saveSharesAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = saveSharesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid shares") };
  try {
    await saveShares(user, parsed.data.partners);
    refresh();
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function addPartnerAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = addPartnerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid name") };
  try {
    await addPartner(user, parsed.data.name);
    refresh();
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function addDrawingAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = addDrawingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid amount") };
  try {
    await addDrawing(user, parsed.data);
    refresh();
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function voidDrawingAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = voidDrawingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid request") };
  try {
    await voidDrawing(user, parsed.data.drawingId, parsed.data.reason);
    refresh();
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
