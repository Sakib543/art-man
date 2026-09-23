import { Lock, TrendingUp, User, Wallet, ChartColumn } from "lucide-react";
import { MonthSelect } from "@/components/month-select";
import { NoOpenDay } from "@/components/no-open-day";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getMonthlyReport } from "@/db/queries/month-report";
import { CloseMonthCard } from "@/features/month-close/components/close-month-card";
import { getCloseState } from "@/features/month-close/queries";
import { ClosedDaysTable, OwnerAccountCard, ProfitAndLoss } from "@/features/monthly-report/components/report-tables";
import { requireRole } from "@/lib/auth/session";
import { rs } from "@/lib/format";

export const metadata = { title: "Monthly report | Art Men's Salon" };

export default async function MonthlyReportPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireRole("owner");
  const { month } = await searchParams;
  const data = await getMonthlyReport(month);

  if (!data) {
    return (
      <>
        <PageHeader title="Monthly report" subtitle="Sales, expenses, staff pay and net profit" />
        <NoOpenDay />
      </>
    );
  }

  const { report } = data;
  const closeState = data.closed ? null : await getCloseState(data.month);

  return (
    <>
      <PageHeader title="Monthly report" subtitle={`${data.monthLabel}, built from closed days plus monthly expenses`}>
        <MonthSelect months={data.months} selected={data.month} basePath="/monthly-report" />
      </PageHeader>

      {data.closed ? (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-lg border border-brass-line bg-brass-soft px-3.5 py-3 text-sm text-brass-strong">
          <Lock className="mt-0.5 size-4.5 shrink-0" aria-hidden />
          <p>{data.monthLabel} is closed and frozen. Any correction found later is added as an adjustment next month.</p>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={TrendingUp} label="Total sales" value={rs(report.sales)} hint={`${report.closedDays} closed day${report.closedDays === 1 ? "" : "s"}`} />
        <StatCard icon={ChartColumn} label="Net profit" value={rs(report.netProfit)} />
        <StatCard
          icon={User}
          label="Received by Owner"
          value={rs(report.owner.reachedOwner)}
          hint={`Online ${rs(report.online)} + cash ${rs(report.owner.reachedOwner - report.online)}`}
        />
        <StatCard icon={Wallet} label="Balance with business" value={rs(report.owner.heldByBusiness)} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ProfitAndLoss report={report} />
        <OwnerAccountCard report={report} />
      </div>

      {closeState ? <CloseMonthCard state={closeState} monthLabel={data.monthLabel} /> : null}

      <ClosedDaysTable days={data.days} report={report} openDay={data.openDay} />
    </>
  );
}
