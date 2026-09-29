import { RefreshCw } from "lucide-react";
import type { MonthRecalculation } from "@/db/queries/month-report";
import { karachiDate } from "@/lib/business-date";
import { formatDate, formatDayMonth, rs } from "@/lib/format";
import { cn } from "@/lib/utils";

/** "bill #45 of 30 Sep was corrected: net profit -Rs 59,560 → -Rs 59,650." */
function changeText(change: MonthRecalculation): string {
  const bill = change.billNo ? `bill #${change.billNo}` : "a bill";
  const of = change.billDate ? ` of ${formatDayMonth(change.billDate)}` : "";
  const profit =
    change.netProfitAfter === change.netProfitBefore
      ? `the net profit did not change (${rs(change.netProfitAfter)}); what reached the Owner did`
      : `net profit ${rs(change.netProfitBefore)} → ${rs(change.netProfitAfter)}`;
  return `${bill}${of} was corrected: ${profit}.`;
}

/**
 * A closed month whose saved report was worked out again after one of its
 * bills was corrected (backlog P1.10): when, after which bill, and what the net
 * profit went from and to. It never says who corrected it — the Owner and the
 * Manager are not shown the developer role (HANDOFF section 6).
 *
 * Shared by the Monthly report and Partners, the two screens that read the
 * saved month — a feature may not import another (`ARCHITECTURE.md` rule 5).
 * Renders nothing for a month that was never recalculated.
 */
export function MonthRecalculatedNote({
  recalculations,
  className,
}: {
  recalculations: MonthRecalculation[];
  className?: string;
}) {
  if (recalculations.length === 0) return null;

  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-info-line bg-info-soft px-3.5 py-3 text-sm text-info",
        className,
      )}
    >
      <RefreshCw className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">Worked out again after it closed</p>
        <ul className="space-y-0.5">
          {recalculations.map((change) => (
            <li key={change.at} className="tabular-nums">
              {formatDate(karachiDate(change.at))}: {changeText(change)}
            </li>
          ))}
        </ul>
        <p className="text-xs">
          The partners&apos; shares were worked out again with the percentages the month closed with. The salaries
          stay as it closed.
        </p>
      </div>
    </div>
  );
}
