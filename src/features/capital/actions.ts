"use server";

import { revalidatePath } from "next/cache";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/session";
import type { SavedOnce } from "@/db/save-once";
import { addInvestmentSchema, addRepaymentSchema } from "./schemas";
import { addInvestment, addRepayment } from "./service";

// Capital and partner accounts are Owner only (see the spec, section 2).

const firstIssue = (error: { issues: { message: string }[] }, fallback: string) => error.issues[0]?.message ?? fallback;

function refresh() {
  for (const path of ["/capital", "/monthly-report", "/partners"]) revalidatePath(path);
}

export async function addInvestmentAction(input: unknown): Promise<ActionResult<SavedOnce>> {
  const user = await requireRole("owner");
  const parsed = addInvestmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid investment") };
  try {
    const saved = await addInvestment(user, parsed.data);
    refresh();
    return { ok: true, data: saved };
  } catch (error) {
    return failure(error);
  }
}

export async function addRepaymentAction(input: unknown): Promise<ActionResult<SavedOnce>> {
  const user = await requireRole("owner");
  const parsed = addRepaymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error, "Invalid installment") };
  try {
    const saved = await addRepayment(user, parsed.data);
    refresh();
    return { ok: true, data: saved };
  } catch (error) {
    return failure(error);
  }
}
