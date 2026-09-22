import { eq } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { requireOwnerOnOpenMonth, resettleDay } from "@/db/day-settlement";
import { getOpenBusinessDay } from "@/db/queries/business-day";
import { billCancellations, billLines, bills } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";

/**
 * Cancel a bill. The bill itself is never changed: a cancellation row and a
 * reversal bill (negative amounts) are added, so the mistake stays visible and
 * the day's totals still add up.
 *
 * Anyone at the counter can cancel a bill from the open day. A bill in a day
 * that is already closed is the Owner's alone, and closing that day is redone
 * afterwards so its figures and security code match the correction.
 */
export async function cancelBill(user: SessionUser, billId: string, reason: string): Promise<void> {
  const day = await getOpenBusinessDay();

  const [bill] = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
  if (!bill) throw new UserError("Bill not found");
  if (bill.reversesBillId) throw new UserError("A reversal bill cannot be cancelled");

  const closedDay = bill.businessDate !== day?.businessDate;
  if (closedDay) await requireOwnerOnOpenMonth(user, bill.businessDate, "bill");

  const [existing] = await db.select().from(billCancellations).where(eq(billCancellations.billId, billId)).limit(1);
  if (existing) throw new UserError("This bill is already cancelled");

  const lines = await db.select().from(billLines).where(eq(billLines.billId, billId));
  const actor = user.username || user.name;

  await db.transaction(async (tx) => {
    await tx.insert(billCancellations).values({ billId, reason, cancelledBy: actor });

    const [reversal] = await tx
      .insert(bills)
      .values({
        businessDate: bill.businessDate,
        customerId: bill.customerId,
        cash: -bill.cash,
        online: -bill.online,
        reversesBillId: bill.id,
        createdBy: actor,
      })
      .returning({ id: bills.id, billNo: bills.billNo });

    await tx.insert(billLines).values(
      lines.map((line) => ({
        billId: reversal.id,
        name: `Reversal of #${bill.billNo}`,
        amount: -line.amount,
        staffId: line.staffId,
      })),
    );

    if (closedDay) await resettleDay(tx, bill.businessDate, actor, `bill #${bill.billNo} cancelled`);

    await writeAudit(tx, {
      actor,
      action: closedDay ? "bill.cancel-closed-day" : "bill.cancel",
      target: `bill #${bill.billNo}`,
      before: { cash: bill.cash, online: bill.online, businessDate: bill.businessDate },
      after: { reason, reversalBillNo: reversal.billNo },
    });
  });
}
