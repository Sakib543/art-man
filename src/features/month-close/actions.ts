"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/session";
import { closeMonth } from "./service";

const schema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/, "Choose a month") });

/** Only the Owner can close a month (see the spec, section 2). */
export async function closeMonthAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a month" };

  try {
    await closeMonth(user, parsed.data.month);
    for (const path of ["/monthly-report", "/monthly-expenses", "/partners", "/capital", "/staff-khata"]) revalidatePath(path);
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
