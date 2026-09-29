"use server";

import { revalidatePath } from "next/cache";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { discardOfflineEntrySchema, entrySchema, voidSchema } from "./schemas";
import { addEntry, discardOfflineEntry, voidEntry, type SavedEntry } from "./service";

export async function addEntryAction(input: unknown): Promise<ActionResult<SavedEntry>> {
  const user = await requireUser();
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid entry" };

  try {
    const saved = await addEntry(user, parsed.data);
    revalidatePath("/folders");
    return { ok: true, data: saved };
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

/**
 * Remove a refused offline entry from the counter's list, with a reason
 * (P2.2e). Any signed-in role may, as any may make or cancel one. `saved` is
 * true when it turns out to have reached the server after all.
 */
export async function discardOfflineEntryAction(input: unknown): Promise<ActionResult<{ saved: boolean }>> {
  const user = await requireUser();
  const parsed = discardOfflineEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };

  try {
    return { ok: true, data: await discardOfflineEntry(user, parsed.data) };
  } catch (error) {
    return failure(error);
  }
}
