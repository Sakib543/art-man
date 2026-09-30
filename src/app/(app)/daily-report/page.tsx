import { AlertTriangle, Lock } from "lucide-react";
import Link from "next/link";
import { NoOpenDay } from "@/components/no-open-day";
import { PageHeader } from "@/components/page-header";
import { DaySelect } from "@/features/daily-report/components/day-select";
import { DaySummary } from "@/features/daily-report/components/day-summary";
import { ReportTable } from "@/features/daily-report/components/report-table";
import { ViewSwitch } from "@/features/daily-report/components/view-switch";
import { getDailyReport } from "@/features/daily-report/queries";
import { readView } from "@/features/daily-report/view";
import { RegisterView } from "@/features/worksheet/components/register-view";
import { getRegister } from "@/features/worksheet/queries";
import { CANCELLATION_ALERT_AT } from "@/lib/alerts";
import { atLeastOwner } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { formatMonth, monthOf } from "@/lib/business-date";

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

  const { days, selected, bills, summary, closing, monthClosed, offlineNote } = report;
  const owner = atLeastOwner(user.role);
  // The register (P6.4) is the old Daily worksheet, for whichever day is chosen.
  const register = view === "register" ? await getRegister(selected.businessDate) : null;

  return (
    <>
      <PageHeader title="Daily report" subtitle={register ? REGISTER_SUBTITLE : SUBTITLE}>
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

      {/* The app expects one counter computer: two offline on one day can clash (P7.10). */}
      {offlineNote ? (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-lg border border-warning-line bg-warning-soft px-3.5 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4.5 shrink-0" aria-hidden />
          <p>{offlineNote}</p>
        </div>
      ) : null}

      {/* The Owner cancels a closed day's bill from here, until the month is
          closed (P0.3). After that the way is an adjustment (P3.4) — said here,
          where the mistake is found, rather than by a refusal. */}
      {owner && monthClosed ? (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-lg border border-brass-line bg-brass-soft px-3.5 py-3 text-sm text-brass-strong">
          <Lock className="mt-0.5 size-4.5 shrink-0" aria-hidden />
          <p>
            {formatMonth(monthOf(selected.businessDate))} is closed, so its bills can no longer be cancelled. A mistake
            here is put right with an adjustment, from the{" "}
            <Link href={`/monthly-report?month=${monthOf(selected.businessDate)}`} className="font-medium underline underline-offset-2">
              Monthly report
            </Link>
            .
          </p>
        </div>
      ) : null}

      <DaySummary summary={summary} closing={closing} />

      {register ? (
        // With the bills made offline that are still on this computer (P2.2e).
        <RegisterView bills={register.bills} staff={register.staff} businessDate={selected.businessDate} />
      ) : (
        <ReportTable bills={bills} canCancel={owner && selected.closed && !monthClosed} />
      )}
    </>
  );
}
