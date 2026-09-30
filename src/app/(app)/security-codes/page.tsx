import { CircleCheck, CircleX, ShieldAlert, ShieldCheck } from "lucide-react";
import { MonthSelect } from "@/components/month-select";
import { NoOpenDay } from "@/components/no-open-day";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { getSecurityCodes } from "@/features/security-codes/queries";
import { checkSummary } from "@/features/security-codes/summary";
import { requireRole } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Security codes | Art Men's Salon" };

const SUBTITLE = "Each closed day's code, worked out again from its records";

/**
 * The Owner checks the days (backlog P7.8, QA-05). Each closed day's code is
 * worked out again from its bills, entries and figures, chained on the code
 * the day before had when this one was sealed. Until a copy of the codes is
 * kept outside the database (QA-26), the Owner's own note of each night's code
 * is the other half of the check: a code here that differs from the note, or a
 * day that does not match, is what to ask about.
 */
export default async function SecurityCodesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireRole("owner");
  const { month } = await searchParams;
  const data = await getSecurityCodes(month);

  if (!data) {
    return (
      <>
        <PageHeader title="Security codes" subtitle={SUBTITLE} />
        <NoOpenDay />
      </>
    );
  }

  const summary = checkSummary(data.days, data.monthLabel);
  const newestFirst = [...data.days].reverse();

  return (
    <>
      <PageHeader title="Security codes" subtitle={SUBTITLE}>
        <MonthSelect months={data.months} selected={data.month} basePath="/security-codes" />
      </PageHeader>

      <div
        role={summary.ok ? "status" : "alert"}
        className={cn(
          "mb-4 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
          summary.ok ? "border-success-line bg-success-soft text-success" : "border-danger-line bg-danger-soft text-destructive",
        )}
      >
        {summary.ok ? <ShieldCheck className="mt-0.5 size-4.5 shrink-0" aria-hidden /> : <ShieldAlert className="mt-0.5 size-4.5 shrink-0" aria-hidden />}
        <p>{summary.text}</p>
      </div>

      {newestFirst.length > 0 ? (
        <Panel>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-surface-sunken text-left text-xs text-muted-foreground">
                <th className="px-card py-2 font-medium">Day</th>
                <th className="px-card py-2 font-medium">Security code</th>
                <th className="px-card py-2 text-right font-medium">Check</th>
              </tr>
            </thead>
            <tbody>
              {newestFirst.map((day) => (
                <tr key={day.businessDate} className="border-b last:border-b-0">
                  {/* One line each: a code broken at its dashes is harder to read out and compare. */}
                  <td className="px-card py-2.5 whitespace-nowrap">{formatDate(day.businessDate)}</td>
                  <td className="px-card py-2.5 font-mono tracking-wide whitespace-nowrap">{day.code}</td>
                  <td className="px-card py-2.5 text-right">
                    {day.ok ? (
                      <span className="inline-flex items-center gap-1.5 text-success">
                        <CircleCheck className="size-4" aria-hidden />
                        <span className="max-sm:sr-only">Matches</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                        <CircleX className="size-4" aria-hidden />
                        <span className="max-sm:sr-only">Does not match</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t px-card py-3 text-xs text-muted-foreground">
            Compare each code with the one noted when the day closed. A day&apos;s code changes when something in it is
            corrected after it closed — a bill or an entry cancelled — and then the new code is the one shown here. A
            day that does not match was changed some other way.
          </p>
        </Panel>
      ) : null}
    </>
  );
}
