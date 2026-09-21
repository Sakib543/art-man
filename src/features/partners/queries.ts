import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { getMonthlyReport } from "@/db/queries/month-report";
import { capitalContributions, capitalItems, capitalRepayments, monthCloses, partnerDrawings, partners } from "@/db/schema";
import { checkShares, partnerAccount, partnerShares } from "@/lib/accounting";
import { monthStart } from "@/lib/business-date";
import type { AccountRow, CapitalLine, DrawingRow, PartnersData } from "./types";

interface SavedShare {
  partnerId: string;
  name: string;
  sharePct: number;
  amount: number;
}

/**
 * The Partners screen for one month. Profit shares come from that month's net
 * profit: worked out now for an open month, or read back as saved for a closed one.
 */
export async function getPartnersData(requestedMonth?: string, selectedId?: string): Promise<PartnersData | null> {
  const monthly = await getMonthlyReport(requestedMonth);
  if (!monthly) return null;
  const start = monthStart(monthly.month);

  const [partnerRows, contributions, repayments, items, drawingRows, [closeRow]] = await Promise.all([
    db.select().from(partners).where(eq(partners.active, true)).orderBy(asc(partners.createdAt)),
    db.select().from(capitalContributions),
    db.select().from(capitalRepayments),
    db.select().from(capitalItems),
    db.select().from(partnerDrawings).where(eq(partnerDrawings.month, start)).orderBy(desc(partnerDrawings.createdAt)),
    db.select().from(monthCloses).where(eq(monthCloses.month, start)).limit(1),
  ]);

  const netProfit = monthly.report.netProfit;

  // A closed month uses the shares saved at close; an open one uses today's percentages.
  const saved = (closeRow?.shares as SavedShare[] | null | undefined) ?? null;
  // Shares are only split when they add up to 100%; otherwise nobody is credited until the Owner fixes them.
  const sharesValid = checkShares(partnerRows.map((p) => p.sharePct)).ok;
  const live: Record<string, number> =
    !saved && sharesValid ? partnerShares(netProfit, partnerRows.map((p) => ({ id: p.id, sharePct: p.sharePct }))) : {};
  const shareOf = (partnerId: string): { pct: number; amount: number; name?: string } => {
    const frozen = saved?.find((s) => s.partnerId === partnerId);
    if (frozen) return { pct: frozen.sharePct, amount: frozen.amount, name: frozen.name };
    const partner = partnerRows.find((p) => p.id === partnerId);
    return { pct: partner?.sharePct ?? 0, amount: live[partnerId] ?? 0 };
  };

  const cancelled = new Set(drawingRows.flatMap((d) => (d.voidsId ? [d.voidsId] : [])));
  const drawnBy = new Map<string, number>();
  for (const d of drawingRows) drawnBy.set(d.partnerId, (drawnBy.get(d.partnerId) ?? 0) + d.amount);

  const shown = saved ? saved.map((s) => s.partnerId) : partnerRows.map((p) => p.id);
  const accounts: AccountRow[] = shown.map((partnerId) => {
    const share = shareOf(partnerId);
    const injected = contributions.filter((c) => c.partnerId === partnerId).reduce((sum, c) => sum + c.amount, 0);
    const repaid = repayments.filter((r) => r.partnerId === partnerId).reduce((sum, r) => sum + r.amount, 0);
    const name = share.name ?? partnerRows.find((p) => p.id === partnerId)?.name ?? "Partner";
    return {
      partnerId,
      name,
      sharePct: share.pct,
      ...partnerAccount({ profitShare: share.amount, injected, repaid, drawn: drawnBy.get(partnerId) ?? 0 }),
    };
  });

  const partnerList = partnerRows.map((p) => ({ id: p.id, name: p.name, sharePct: p.sharePct }));
  const chosen = accounts.find((a) => a.partnerId === selectedId);

  let selected: PartnersData["selected"] = null;
  if (chosen) {
    const capital: CapitalLine[] = contributions
      .filter((c) => c.partnerId === chosen.partnerId)
      .map((c) => {
        const repaid = repayments
          .filter((r) => r.capitalItemId === c.capitalItemId && r.partnerId === chosen.partnerId)
          .reduce((sum, r) => sum + r.amount, 0);
        return {
          name: items.find((item) => item.id === c.capitalItemId)?.name ?? "Investment",
          putIn: c.amount,
          repaid,
          owedBack: c.amount - repaid,
        };
      });

    const drawings: DrawingRow[] = drawingRows
      .filter((d) => d.partnerId === chosen.partnerId)
      .map((d) => ({
        id: d.id,
        createdAt: d.createdAt.toISOString(),
        note: d.note,
        amount: d.amount,
        voided: cancelled.has(d.id),
        isVoid: d.voidsId !== null,
      }));

    selected = {
      partner: { id: chosen.partnerId, name: chosen.name, sharePct: chosen.sharePct },
      account: chosen,
      capital,
      drawings,
    };
  }

  return {
    month: monthly.month,
    monthLabel: monthly.monthLabel,
    closed: monthly.closed,
    months: monthly.months,
    netProfit,
    partners: partnerList,
    accounts,
    selected,
  };
}
