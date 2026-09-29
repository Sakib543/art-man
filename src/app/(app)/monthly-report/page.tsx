import { Lock, TrendingUp, User, Wallet, ChartColumn } from "lucide-react";
import { MonthRecalculatedNote } from "@/components/month-recalculated-note";
import { MonthSelect } from "@/components/month-select";
import { NoOpenDay } from "@/components/no-open-day";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getMonthlyReport } from "@/db/queries/month-report";
import { AdjustmentsCard } from "@/features/month-adjustments/components/adjustments-card";
import { RecordAdjustment } from "@/features/month-adjustments/components/record-adjustment";
import { getAdjustmentsData } from "@/features/month-adjustments/queries";
import { CloseMonthCard } from "@/features/month-close/components/close-month-card";
import { getCloseState } from "@/features/month-close/queries";
import { ClosedDaysTable, OwnerAccountCard, ProfitAndLoss } from "@/features/monthly-report/components/report-tables";
import { requireRole } from "@/lib/auth/session";
import { formatMonth } from "@/lib/business-date";
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
  const [closeState, adjustments] = await Promise.all([
    data.closed ? null : getCloseState(data.month),
    getAdjustmentsData(data.month),
  ]);
  const { record } = adjustments;

  return (
    <>
      <PageHeader title="Monthly report" subtitle={`${data.monthLabel}, built from closed days plus monthly expenses`}>
        <MonthSelect months={data.months} selected={data.month} basePath="/monthly-report" />
      </PageHeader>

      {data.closed ? (
        <div className="mb-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-3 rounded-lg border border-brass-line bg-brass-soft px-3.5 py-3 text-sm text-brass-strong">
          <Lock className="size-4.5 shrink-0 self-start max-sm:mt-0.5 sm:self-center" aria-hidden />
          <div className="min-w-0 flex-1 basis-60 space-y-1">
            <p>
              {data.monthLabel} is closed and frozen. A mistake found in it now is put right with an adjustment, which
              counts in the month that is open{"countsIn" in record ? ` (${formatMonth(record.countsIn)})` : ""}.
            </p>
            {"blocked" in record ? <p className="text-xs">{record.blocked}</p> : null}
          </div>
          {"countsIn" in record ? <RecordAdjustment month={data.month} countsIn={record.countsIn} staff={record.staff} /> : null}
        </div>
      ) : null}

      <MonthRecalculatedNote recalculations={data.recalculations} className="mb-3.5" />

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

      {adjustments.countedHere.length > 0 ? (
        <AdjustmentsCard
          title="Adjustments for earlier months"
          description={`Mistakes found in a closed month, put right in ${data.monthLabel}.`}
          rows={adjustments.countedHere}
          show="corrects"
        />
      ) : null}

      {adjustments.forThisMonth.length > 0 ? (
        <AdjustmentsCard
          title="Adjustments recorded later"
          description={`Mistakes found in ${data.monthLabel} after it closed. Each counts in the month named, not in this report.`}
          rows={adjustments.forThisMonth}
          show="countsIn"
        />
      ) : null}

      <ClosedDaysTable days={data.days} report={report} openDay={data.openDay} />
    </>
  );
}
