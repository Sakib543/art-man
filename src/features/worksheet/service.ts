import { eq } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { getOpenBusinessDay } from "@/db/queries/business-day";
import { billLines, bills, staff } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import type { QuickAddInput } from "./schemas";

/**
 * Add an amount to one staff member's column. It saves a small ordinary bill
 * (one line, no service), so commission and Day Close stay correct.
 */
export async function quickAdd(user: SessionUser, input: QuickAddInput): Promise<{ billNo: number }> {
  const day = await getOpenBusinessDay();
  if (!day) throw new UserError("Today is closed. Start the next business day first.");

  const [member] = await db.select({ id: staff.id, name: staff.name, active: staff.active }).from(staff).where(eq(staff.id, input.staffId)).limit(1);
  if (!member || !member.active) throw new UserError("That staff member is not available");

  const actor = user.username || user.name;

  return db.transaction(async (tx) => {
    const [bill] = await tx
      .insert(bills)
      .values({
        businessDate: day.businessDate,
        cash: input.payMode === "cash" ? input.amount : 0,
        online: input.payMode === "online" ? input.amount : 0,
        createdBy: actor,
      })
      .returning({ id: bills.id, billNo: bills.billNo });

    await tx.insert(billLines).values({ billId: bill.id, name: "Quick add", amount: input.amount, staffId: member.id });

    await writeAudit(tx, {
      actor,
      action: "bill.create",
      target: `bill #${bill.billNo}`,
      after: { quickAdd: true, staff: member.name, amount: input.amount, payMode: input.payMode },
    });
    return { billNo: bill.billNo };
  });
}
