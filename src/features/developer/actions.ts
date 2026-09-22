"use server";

import { revalidatePath } from "next/cache";
import { setMaintenance } from "@/db/app-settings";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/session";
import { maintenanceSchema, resetPasswordSchema, resetPinSchema } from "./schemas";
import { resetPassword, resetPin } from "./service";

const firstIssue = (error: { issues: { message: string }[] }, fallback: string) =>
  error.issues[0]?.message ?? fallback;

export async function resetPasswordAction(input: unknown): Promise<ActionResult<null>> {
  const dev = await requireRole("developer");
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid password") };

  try {
    await resetPassword(dev, parsed.data.userId, parsed.data.newPassword);
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
