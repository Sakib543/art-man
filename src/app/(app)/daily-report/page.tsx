import { AlertTriangle, Banknote, CircleCheck, Pencil, QrCode, Receipt, Scissors, TrendingUp, Undo2, Wallet } from "lucide-react";
import { BusinessDayPill } from "@/components/business-day-pill";
import { NoOpenDay } from "@/components/no-open-day";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { DaySelect } from "@/features/daily-report/components/day-select";
import { ReportTable } from "@/features/daily-report/components/report-table";
import { getDailyReport } from "@/features/daily-report/queries";
import { CANCELLATION_ALERT_AT } from "@/lib/alerts";
import { atLeastOwner } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { rs } from "@/lib/format";

export const metadata = { title: "Daily report | Art Men's Salon" };

const SUBTITLE = "All bills for a business day, including cancelled ones";

export default async function DailyReportPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireUser();
  const { date } = await searchParams;
  const report = await getDailyReport(date);

  if (!report) {
    return (
      <>
        <PageHeader title="Daily report" subtitle={SUBTITLE} />
        <NoOpenDay />
      </>
    );
  }

  const { days, selected, bills, summary, closing } = report;

  return (
    <>
      <PageHeader title="Daily report" subtitle={SUBTITLE}>
        <div className="flex flex-wrap items-center gap-2.5">
          <DaySelect days={days} selected={selected.businessDate} />
          <BusinessDayPill businessDate={selected.businessDate} closed={selected.closed} />
        </div>
      </PageHeader>

      {summary.cancelledBills >= CANCELLATION_ALERT_AT ? (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-lg border border-warning-line bg-warning-soft px-3.5 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4.5 shrink-0" aria-hidden />
          <p>{summary.cancelledBills} bills were cancelled on this day. Check the reason given for each.</p>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard icon={TrendingUp} label="Total sales" value={rs(summary.total)} />
        <StatCard icon={Banknote} label="Cash" value={rs(summary.cash)} />
        <StatCard icon={QrCode} label="Online" value={rs(summary.online)} />
        <StatCard icon={Receipt} label="Paid bills" value={String(summary.paidBills)} />
        <StatCard icon={Undo2} label="Cancelled" value={String(summary.cancelledBills)} />
        <StatCard
          icon={Pencil}
          label="Edited"
          value={String(summary.editedBills)}
          hint="Corrected bills, shown as one line each"
        />
        {/* Only when there was one: a row of zeros every day would be noise,
            and a discount is meant to stand out (P3.10). */}
        {summary.discount > 0 ? (
          <StatCard
            icon={Scissors}
            label="Discount given"
            value={rs(summary.discount)}
            hint="Already taken off the sales above"
          />
        ) : null}
      </div>

      {closing ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Wallet} label="Expected cash" value={rs(closing.expectedCash)} />
          <StatCard icon={Banknote} label="Counted" value={rs(closing.countedCash)} />
          <StatCard
            icon={CircleCheck}
            label={closing.difference < 0 ? "Short" : closing.difference > 0 ? "Extra" : "Difference"}
            value={rs(Math.abs(closing.difference))}
          />
          <StatCard icon={CircleCheck} label="Security code" value={closing.securityCode} hint="Sent to the Owner at close" />
        </div>
      ) : null}

      <ReportTable bills={bills} canCancel={atLeastOwner(user.role) && selected.closed} />
    </>
  );
}
