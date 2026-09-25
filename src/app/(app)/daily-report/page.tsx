import { AlertTriangle } from "lucide-react";
import { NoOpenDay } from "@/components/no-open-day";
import { PageHeader } from "@/components/page-header";
import { DaySelect } from "@/features/daily-report/components/day-select";
import { DaySummary } from "@/features/daily-report/components/day-summary";
import { ReportTable } from "@/features/daily-report/components/report-table";
import { ViewSwitch } from "@/features/daily-report/components/view-switch";
import { getDailyReport } from "@/features/daily-report/queries";
import { readView } from "@/features/daily-report/view";
import { WorksheetGrid } from "@/features/worksheet/components/worksheet-grid";
import { getSheet } from "@/features/worksheet/queries";
import { CANCELLATION_ALERT_AT } from "@/lib/alerts";
import { atLeastOwner } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Daily report | Art Men's Salon" };

const SUBTITLE = "All bills for a business day, including cancelled ones";
const REGISTER_SUBTITLE = "The day's bills as a column per person, like the paper register";

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const user = await requireUser();
  const { date, view: requestedView } = await searchParams;
  const view = readView(requestedView);
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
  // The register (P6.4) is the old Daily worksheet, for whichever day is chosen.
  const sheet = view === "register" ? await getSheet(selected.businessDate) : null;

  return (
    <>
      <PageHeader title="Daily report" subtitle={sheet ? REGISTER_SUBTITLE : SUBTITLE}>
        <div className="flex flex-wrap items-center gap-2.5">
          <ViewSwitch date={selected.businessDate} view={view} />
          {/* The picker already says "(open)" or "(closed)", so the business-day
              pill every other counter screen carries would only say it twice. */}
          <DaySelect days={days} selected={selected.businessDate} view={view} />
        </div>
      </PageHeader>

      {summary.cancelledBills >= CANCELLATION_ALERT_AT ? (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-lg border border-warning-line bg-warning-soft px-3.5 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4.5 shrink-0" aria-hidden />
          <p>{summary.cancelledBills} bills were cancelled on this day. Check the reason given for each.</p>
        </div>
      ) : null}

      <DaySummary summary={summary} closing={closing} />

      {sheet ? (
        <WorksheetGrid sheet={sheet} />
      ) : (
        <ReportTable bills={bills} canCancel={atLeastOwner(user.role) && selected.closed} />
      )}
    </>
  );
}
