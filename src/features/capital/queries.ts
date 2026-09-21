import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { capitalContributions, capitalItems, capitalRepayments, partners } from "@/db/schema";
import { funderPosition } from "@/lib/accounting";
import { karachiDate } from "@/lib/business-date";
import type { CapitalData, InvestmentRow } from "./types";

export async function getCapitalData(): Promise<CapitalData> {
  const [partnerRows, items, contributions, repayments] = await Promise.all([
    db.select({ id: partners.id, name: partners.name }).from(partners).where(eq(partners.active, true)).orderBy(asc(partners.createdAt)),
    db.select().from(capitalItems).orderBy(asc(capitalItems.createdAt)),
    db.select().from(capitalContributions),
    db.select().from(capitalRepayments).orderBy(asc(capitalRepayments.paidOn), asc(capitalRepayments.createdAt)),
  ]);

  // Names for every partner, active or not, since an old investment may name someone now inactive.
  const allPartners = await db.select({ id: partners.id, name: partners.name }).from(partners);
  const nameOf = new Map(allPartners.map((partner) => [partner.id, partner.name]));

  const investments = items.map<InvestmentRow>((item) => {
    const itemRepayments = repayments.filter((r) => r.capitalItemId === item.id);
    const funders = contributions
      .filter((c) => c.capitalItemId === item.id)
      .map((c) => {
        const position = funderPosition(
          c.amount,
          itemRepayments.filter((r) => r.partnerId === c.partnerId).map((r) => r.amount),
        );
        return { partnerId: c.partnerId, partnerName: nameOf.get(c.partnerId) ?? "Partner", ...position };
      });

    const paid = itemRepayments.reduce((sum, r) => sum + r.amount, 0);
    return {
      id: item.id,
      name: item.name,
      addedOn: karachiDate(item.createdAt),
      total: item.totalCost,
      paid,
      remaining: item.totalCost - paid,
      funders,
      repayments: itemRepayments.map((r) => ({
        id: r.id,
        paidOn: r.paidOn,
        partnerName: nameOf.get(r.partnerId) ?? "Partner",
        note: r.note,
        amount: r.amount,
      })),
    };
  });

  const invested = investments.reduce((sum, i) => sum + i.total, 0);
  const paid = investments.reduce((sum, i) => sum + i.paid, 0);

  return { partners: partnerRows, investments: [...investments].reverse(), totals: { invested, paid, outstanding: invested - paid } };
}
