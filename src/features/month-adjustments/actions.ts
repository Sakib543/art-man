"use server";

import { revalidatePath } from "next/cache";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/session";
import type { SavedOnce } from "@/db/save-once";
import { cancelAdjustmentSchema, recordAdjustmentSchema } from "./schemas";
import { cancelAdjustment, recordAdjustment } from "./service";

/** Every screen an adjustment shows on: the month's profit, the partners' shares, the khata. */
function refresh() {
  for (const path of ["/monthly-report", "/partners", "/staff-khata"]) revalidatePath(path);
}

/** Only the Owner corrects a closed month, as only the Owner closes one (spec §2, §7.4). */
export async function recordAdjustmentAction(input: unknown): Promise<ActionResult<SavedOnce>> {
  // Outside the try: it redirects.
  const user = await requireRole("owner");
  const parsed = recordAdjustmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };

  try {
    const data = await recordAdjustment(user, parsed.data);
    refresh();
    return { ok: true, data };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelAdjustmentAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = cancelAdjustmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };

  try {
    await cancelAdjustment(user, parsed.data);
    refresh();
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
