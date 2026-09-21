import { Banknote, ChartColumn, Landmark, PieChart, Wallet } from "lucide-react";
import Link from "next/link";
import { MonthSelect } from "@/components/month-select";
import { NoOpenDay } from "@/components/no-open-day";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { AccountsTable } from "@/features/partners/components/accounts-table";
import { DrawingsCard } from "@/features/partners/components/drawings-card";
import { SharesCard } from "@/features/partners/components/shares-card";
import { getPartnersData } from "@/features/partners/queries";
import { requireRole } from "@/lib/auth/session";
import { num, rs } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Partners | Art Men's Salon" };

interface PageProps {
  searchParams: Promise<{ month?: string; partner?: string }>;
}

export default async function PartnersPage({ searchParams }: PageProps) {
  await requireRole("owner");
  const { month, partner } = await searchParams;
  const data = await getPartnersData(month, partner);

  if (!data) {
    return (
      <>
        <PageHeader title="Partners" subtitle="Profit share, capital and net position for each partner" />
        <NoOpenDay />
      </>
    );
  }

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "-mb-px min-h-10 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap",
        active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground",
      )}
    >
      {label}
    </Link>
  );
  const base = `/partners?month=${data.month}`;
  const { selected } = data;

  return (
    <>
      <PageHeader title="Partners" subtitle={`${data.monthLabel}. Profit comes from the Monthly report.`}>
        <MonthSelect months={data.months} selected={data.month} basePath="/partners" />
      </PageHeader>

      <nav aria-label="Partners" className="mb-4 flex gap-1 overflow-x-auto rounded-[14px] border bg-card px-[18px]">
        {tab(base, "All partners", !selected)}
        {data.accounts.map((a) => tab(`${base}&partner=${a.partnerId}`, a.name, selected?.partner.id === a.partnerId))}
      </nav>

      {!selected ? (
        <div className="space-y-4">
          {data.closed ? (
            <p className="rounded-[10px] border border-[#efe0c8] bg-brass-soft px-3.5 py-3 text-[13.5px] text-brass-strong">
              {data.monthLabel} is closed. These are the shares it closed with.
            </p>
          ) : (
            <SharesCard key={data.partners.map((p) => `${p.id}${p.sharePct}${p.name}`).join()} partners={data.partners} netProfit={data.netProfit} monthLabel={data.monthLabel} />
          )}
          <AccountsTable accounts={data.accounts} />
        </div>
      ) : (
        <>
          <p className="mb-3.5 flex items-start gap-2.5 rounded-[10px] border border-[#efe0c8] bg-brass-soft px-3.5 py-3 text-[13.5px] text-brass-strong">
            Profit share = <b className="tabular-nums">{selected.partner.sharePct}%</b> of {rs(data.netProfit)} →{" "}
            <b className="tabular-nums">{rs(selected.account.profitShare)}</b>
          </p>

          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={ChartColumn} label="Profit share" value={rs(selected.account.profitShare)} hint={`${selected.partner.sharePct}% of net profit`} />
            <StatCard icon={Landmark} label="Capital injected" value={rs(selected.account.injected)} />
            <StatCard icon={Banknote} label="Repayments received" value={rs(selected.account.repaid)} hint={`Capital owed ${num(selected.account.owed)}`} />
            <StatCard icon={Wallet} label="Net position" value={rs(selected.account.netPosition)} hint={`Business owes ${selected.partner.name}`} />
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <div className="rounded-[14px] border bg-card">
              <div className="flex items-center gap-2 border-b px-[18px] py-3.5">
                <PieChart className="size-4 text-muted-foreground" aria-hidden />
                <h2 className="text-[15px] font-semibold">Capital, separate from profit</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#fafbfc] text-left text-[12.5px] text-muted-foreground">
                    <th className="px-[18px] py-2 font-medium">Investment</th>
                    <th className="px-[18px] py-2 text-right font-medium">Put in</th>
                    <th className="px-[18px] py-2 text-right font-medium">Repaid</th>
                    <th className="px-[18px] py-2 text-right font-medium">Owed back</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.capital.map((line) => (
                    <tr key={line.name} className="border-b last:border-b-0">
                      <td className="px-[18px] py-2.5">{line.name}</td>
                      <td className="px-[18px] py-2.5 text-right tabular-nums">{num(line.putIn)}</td>
                      <td className="px-[18px] py-2.5 text-right tabular-nums">{num(line.repaid)}</td>
                      <td className="px-[18px] py-2.5 text-right font-medium tabular-nums">{num(line.owedBack)}</td>
                    </tr>
                  ))}
                  {selected.capital.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No capital from this partner
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <DrawingsCard partnerId={selected.partner.id} month={data.month} rows={selected.drawings} closed={data.closed} />
          </div>
        </>
      )}
    </>
  );
}
