import { eq } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { getLatestBusinessDay } from "@/db/queries/business-day";
import { isMonthClosed } from "@/db/queries/months";
import { khataEntries, staff } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { monthOf } from "@/lib/business-date";
import { UserError } from "@/lib/errors";
import { bonusLabel, checkBonus } from "./rules";
import type { BonusInput } from "./schemas";

const actorOf = (user: SessionUser) => user.username || user.name;

/**
 * Give a staff member a bonus (backlog P3.1). Spec §10.10: the Owner alone.
 *
 * It is one khata line and no cash. A bonus is money the salon now owes the
 * staff member; handing it over is an ordinary staff payment in the day's
 * folders, exactly as with a commission. Keeping the two apart is what lets a
 * bonus be given on a day that is already closed: it touches neither the
 * drawer, nor that day's closing figures, nor its security code.
 *
 * It does reach the month's accounts — `getMonthlyReport` counts the month's
 * bonuses as part of what staff earned — which is why a closed month is
 * refused here.
 */
export async function giveBonus(current: SessionUser, input: BonusInput): Promise<{ staffName: string }> {
  const day = await getLatestBusinessDay();
  if (!day) throw new UserError("No business day has been opened yet.");

  const [member] = await db.select().from(staff).where(eq(staff.id, input.staffId)).limit(1);
  if (!member) throw new UserError("That staff member was not found.");

  const problem = checkBonus({ active: member.active, monthClosed: await isMonthClosed(monthOf(day.businessDate)) });
  if (problem) throw new UserError(problem);

  const actor = actorOf(current);
  await db.transaction(async (tx) => {
    await tx.insert(khataEntries).values({
      staffId: member.id,
      businessDate: day.businessDate,
      kind: "bonus",
      label: bonusLabel(input.reason),
      amount: input.amount,
    });
    await writeAudit(tx, {
      actor,
      action: "khata.bonus",
      target: member.name,
      after: { amount: input.amount, reason: input.reason, businessDate: day.businessDate },
    });
  });

  return { staffName: member.name };
}
