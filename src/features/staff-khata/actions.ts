"use server";

import { revalidatePath } from "next/cache";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/session";
import { bonusSchema } from "./schemas";
import { giveBonus } from "./service";

export async function giveBonusAction(input: unknown): Promise<ActionResult<{ staffName: string }>> {
  // Spec §10.10: only the Owner gives bonuses. `requireRole` lets the developer
  // through, as everywhere else. It is outside the try: it redirects.
  const actor = await requireRole("owner");
  const parsed = bonusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };

  try {
    const data = await giveBonus(actor, parsed.data);
    revalidatePath("/staff-khata");
    revalidatePath("/monthly-report");
    return { ok: true, data };
  } catch (error) {
    return failure(error);
  }
}
