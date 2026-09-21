"use server";

import { revalidatePath } from "next/cache";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { quickAddSchema } from "./schemas";
import { quickAdd } from "./service";

export async function quickAddAction(input: unknown): Promise<ActionResult<{ billNo: number }>> {
  const user = await requireUser();
  const parsed = quickAddSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid amount" };

  try {
    const result = await quickAdd(user, parsed.data);
    for (const path of ["/worksheet", "/billing", "/folders", "/daily-report"]) revalidatePath(path);
    return { ok: true, data: result };
  } catch (error) {
    return failure(error);
  }
}
