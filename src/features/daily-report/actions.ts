"use server";

import { revalidatePath } from "next/cache";
import { cancelBill } from "@/db/bill-cancel";
import { failure, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/session";
import { cancelClosedBillSchema } from "./schemas";

/** Cancelling a bill from a day that is already closed: the Owner's alone (spec 11). */
export async function cancelClosedBillAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireRole("owner");
  const parsed = cancelClosedBillSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };

  try {
    await cancelBill(user, parsed.data.billId, parsed.data.reason);
    revalidatePath("/daily-report");
    return { ok: true, data: null };
  } catch (error) {
    return failure(error);
  }
}
