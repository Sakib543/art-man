import { Panel } from "@/components/panel";
import { Banknote, Info, Landmark, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { InvestmentCard } from "@/features/capital/components/investment-card";
import { NewInvestmentForm } from "@/features/capital/components/new-investment-form";
import { getCapitalData } from "@/features/capital/queries";
import { requireRole } from "@/lib/auth/session";
import { rs } from "@/lib/format";

export const metadata = { title: "Capital / Outstanding | Art Men's Salon" };

export default async function CapitalPage() {
  await requireRole("owner");
  const { partners, investments, totals } = await getCapitalData();

  return (
    <>
      <PageHeader title="Capital / Outstanding" subtitle="Big one-off investments funded by partners and repaid in installments" />

      <div className="mb-3.5 flex items-start gap-2.5 rounded-lg border border-info-line bg-info-soft px-3.5 py-3 text-sm text-info">
        <Info className="mt-0.5 size-4.5 shrink-0" aria-hidden />
        <p>
          This is capital, not an expense: a partner put the money in and the business pays it back in installments. It
          does not reduce the month&apos;s net profit.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard icon={Landmark} label="Total invested" value={rs(totals.invested)} hint={`${investments.length} investment${investments.length === 1 ? "" : "s"}`} />
        <StatCard icon={Banknote} label="Paid back" value={rs(totals.paid)} />
        <StatCard icon={TriangleAlert} label="Outstanding to partners" value={rs(totals.outstanding)} hint="Liability, not an expense" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {investments.map((investment) => (
            <InvestmentCard key={investment.id} investment={investment} />
          ))}
          {investments.length === 0 ? (
            <Panel className="px-6 py-12 text-center text-muted-foreground">
              <Landmark className="mx-auto mb-2 size-7 text-muted-foreground/50" aria-hidden />
              <p>No investments yet</p>
            </Panel>
          ) : null}
        </div>
        <NewInvestmentForm partners={partners} />
      </div>
    </>
  );
}
