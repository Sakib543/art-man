"use server";

import { headers } from "next/headers";
import { failure, type ActionResult } from "@/lib/action-result";
import { auth } from "@/lib/auth/server";
import { requireRole, requireUser } from "@/lib/auth/session";
import { changePasswordSchema, changePinSchema, resetManagerPasswordSchema } from "./schemas";
import { changeOwnerPin, changeOwnPassword, resetManagerPassword } from "./service";

const firstIssue = (error: { issues: { message: string }[] }, fallback: string) => error.issues[0]?.message ?? fallback;

export async function changePasswordAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid password") };

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    await changeOwnPassword(user, session?.session.token ?? "", parsed.data);
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function changePinAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = changePinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid PIN") };

  try {
    await changeOwnerPin(user, parsed.data);
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function resetManagerPasswordAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = resetManagerPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid password") };

  try {
    await resetManagerPassword(user, parsed.data.newPassword);
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
