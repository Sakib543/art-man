"use server";

import { revalidatePath } from "next/cache";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireRole, requireUser } from "@/lib/auth/session";
import { closeSchema, openFirstDaySchema, reviewSchema } from "./schemas";
import { closeDay, openFirstDay, reviewClose, startNextDay } from "./service";
import type { CloseReview } from "./types";

const firstIssue = (error: { issues: { message: string }[] }, fallback: string) => error.issues[0]?.message ?? fallback;

function refresh() {
  // The open/closed state of the day changes what Billing and Folders show.
  for (const path of ["/day-close", "/billing", "/folders"]) revalidatePath(path);
}

export async function reviewCloseAction(input: unknown): Promise<ActionResult<CloseReview>> {
  await requireUser();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Enter the cash counted") };

  try {
    return { ok: true, data: await reviewClose(parsed.data) };
  } catch (error) {
    return failure(error);
  }
}

export async function closeDayAction(input: unknown): Promise<ActionResult<{ securityCode: string }>> {
  const user = await requireUser();
  const parsed = closeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid details") };

  try {
    const result = await closeDay(user, parsed.data);
    refresh();
    return { ok: true, data: result };
  } catch (error) {
    return failure(error);
  }
}

export async function startNextDayAction(): Promise<ActionResult<null>> {
  const user = await requireUser();
  try {
    await startNextDay(user);
    refresh();
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function openFirstDayAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = openFirstDaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid details") };

  try {
    await openFirstDay(user, parsed.data.businessDate, parsed.data.openingCash);
    refresh();
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
