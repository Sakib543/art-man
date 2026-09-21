import { eq } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { getMonthlyReport } from "@/db/queries/month-report";
import { khataEntries, monthCloses, partners } from "@/db/schema";
import { checkShares, partnerShares } from "@/lib/accounting";
import type { SessionUser } from "@/lib/auth/session";
import { formatMonth, monthStart } from "@/lib/business-date";
import { UserError } from "@/lib/errors";
import { getCloseState } from "./queries";

/**
 * Close a month, in one transaction:
 *  - the month's report and each partner's share are saved as they are now,
 *  - the monthly salaries are added to the staff khata,
 *  - the month is frozen (every screen already refuses changes to a closed month).
 * If anything fails, none of it is saved.
 */
export async function closeMonth(user: SessionUser, month: string): Promise<void> {
  const state = await getCloseState(month);
  if (state.blockers.length > 0) throw new UserError(state.blockers[0]);
  if (!state.lastDay) throw new UserError("This month has no business days.");

  const monthly = await getMonthlyReport(month);
  if (!monthly) throw new UserError("Nothing to close yet.");
  const report = monthly.live;

  const partnerRows = await db.select().from(partners).where(eq(partners.active, true));
  if (!checkShares(partnerRows.map((p) => p.sharePct)).ok) throw new UserError("The partners' shares must add up to 100%.");
  const amounts = partnerShares(report.netProfit, partnerRows.map((p) => ({ id: p.id, sharePct: p.sharePct })));
  const shares = partnerRows.map((p) => ({ partnerId: p.id, name: p.name, sharePct: p.sharePct, amount: amounts[p.id] }));

  const actor = user.username || user.name;
  const label = `Monthly salary (${formatMonth(month)})`;

  await db.transaction(async (tx) => {
    // The month is saved first: the primary key stops two people closing it at once.
    await tx.insert(monthCloses).values({ month: monthStart(month), closedBy: actor, report, shares });

    for (const line of state.salaries) {
      await tx.insert(khataEntries).values({
        staffId: line.staffId,
        businessDate: state.lastDay!,
        kind: "earning",
        label,
        amount: line.salary,
      });
    }

    await writeAudit(tx, {
      actor,
      action: "month.close",
      target: month,
      after: { netProfit: report.netProfit, salaries: report.salaries, shares },
    });
  });
}
