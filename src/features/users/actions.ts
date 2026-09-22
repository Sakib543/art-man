"use server";

import { revalidatePath } from "next/cache";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/session";
import { createUserSchema, resetUserPasswordSchema, setUserActiveSchema } from "./schemas";
import { createUser, resetUserPassword, setUserActive } from "./service";

const firstIssue = (error: { issues: { message: string }[] }, fallback: string) =>
  error.issues[0]?.message ?? fallback;

export async function createUserAction(input: unknown): Promise<ActionResult<{ username: string }>> {
  // The Owner manages logins; `requireRole` lets the developer through too.
  const actor = await requireRole("owner");
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Check the details") };

  try {
    const data = await createUser(actor, parsed.data);
    revalidatePath("/users");
    return { ok: true, data };
  } catch (error) {
    return failure(error);
  }
}

export async function resetUserPasswordAction(input: unknown): Promise<ActionResult<null>> {
  const actor = await requireRole("owner");
  const parsed = resetUserPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid password") };

  try {
    await resetUserPassword(actor, parsed.data.userId, parsed.data.newPassword);
    revalidatePath("/users");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function setUserActiveAction(input: unknown): Promise<ActionResult<null>> {
  const actor = await requireRole("owner");
  const parsed = setUserActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid request") };

  try {
    await setUserActive(actor, parsed.data.userId, parsed.data.active);
    revalidatePath("/users");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
