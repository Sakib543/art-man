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
 * the day before had when this one was sealed. The other half of the check is
 * outside the database (P7.8b, QA-26): the close slip printed each night, and
 * the server's key, which the database does not hold. A code here that differs
 * from the slip, or a day that does not match, is what to ask about.
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

  // With the key set wrongly nothing can be checked, and the screen says so rather than calling every day changed.
  const summary =
    data.key.state === "invalid"
      ? { ok: false, text: "The days cannot be checked: the server's key for security codes is not set up right. Tell the developer." }
      : checkSummary(data.days, data.monthLabel);
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
          <div className="space-y-2 border-t px-card py-3 text-xs text-muted-foreground">
            <p>
              Compare each code with the one on the day&apos;s close slip, printed when the day closed. A day&apos;s code
              changes when something in it is corrected after it closed — a bill or an entry cancelled — and then the new
              code is the one shown here. A day that does not match was changed some other way.
            </p>
            {data.key.state === "set" ? (
              <p>
                From {formatDate(data.key.since)}, each code is also sealed with a key kept on the server, not in the
                database: a day changed in the database cannot be made to match again without it.
              </p>
            ) : (
              <p>
                Keep every close slip. Someone able to change the database directly could work a changed day&apos;s code out
                again; the slip keeps the code as it was.
              </p>
            )}
          </div>
        </Panel>
      ) : null}
    </>
  );
}
