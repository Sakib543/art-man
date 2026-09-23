"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { setMaintenance } from "@/db/app-settings";
import { failure, type ActionResult } from "@/lib/action-result";
import { auth } from "@/lib/auth/server";
import { requireRole } from "@/lib/auth/session";
import { editBillRowSchema, maintenanceSchema, resetPasswordSchema, resetPinSchema } from "./schemas";
import { editBillRow, resetPassword, resetPin } from "./service";

const firstIssue = (error: { issues: { message: string }[] }, fallback: string) =>
  error.issues[0]?.message ?? fallback;

export async function resetPasswordAction(input: unknown): Promise<ActionResult<null>> {
  const dev = await requireRole("developer");
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid password") };

  try {
    // Needed only when the developer resets themselves: it is the one session
    // the reset must spare, or they would be signed out by their own click.
    const session = await auth.api.getSession({ headers: await headers() });
    await resetPassword(dev, parsed.data.userId, parsed.data.newPassword, session?.session.token);
    revalidatePath("/developer/passwords");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function resetPinAction(input: unknown): Promise<ActionResult<null>> {
  const dev = await requireRole("developer");
  const parsed = resetPinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid PIN") };

  try {
    await resetPin(dev, parsed.data.userId, parsed.data.newPin);
    revalidatePath("/developer/passwords");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function setMaintenanceAction(input: unknown): Promise<ActionResult<null>> {
  const dev = await requireRole("developer");
  const parsed = maintenanceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  try {
    await setMaintenance(dev.username || dev.name, parsed.data.on);
    revalidatePath("/developer/maintenance");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function editBillRowAction(input: unknown): Promise<ActionResult<null>> {
  const dev = await requireRole("developer");
  const parsed = editBillRowSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid bill") };

  try {
    await editBillRow(dev, parsed.data);
    revalidatePath("/developer/bills");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
