"use server";

import { revalidatePath } from "next/cache";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { entrySchema, voidSchema } from "./schemas";
import { addEntry, voidEntry } from "./service";

export async function addEntryAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireUser();
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid entry" };

  try {
    await addEntry(user, parsed.data);
    revalidatePath("/folders");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function voidEntryAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireUser();
  const parsed = voidSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };

  try {
    await voidEntry(user, parsed.data.entryId, parsed.data.reason);
    revalidatePath("/folders");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
