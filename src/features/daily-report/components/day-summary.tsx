import { Panel } from "@/components/panel";
import { rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ClosingFigures } from "../queries";
import type { ReportSummary } from "../summary";

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="bg-card px-card py-3.5">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className={cn("mt-0.5 text-xl font-semibold tracking-tight whitespace-nowrap tabular-nums", className)}>
        {value}
      </p>
    </div>
  );
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * The day in one panel (P6.5). It replaced a row of six cards — and four more
 * on a closed day — that wrapped "Rs 11,250" onto two lines and cut "Discount
 * given" short, and showed "Cancelled 0" every day.
 *
 * The money leads; the counts follow in one quiet line, and each count beyond
 * the paid bills appears only when there is something to say.
 */
export function DaySummary({ summary, closing }: { summary: ReportSummary; closing: ClosingFigures | null }) {
  const difference = closing?.difference ?? 0;

  return (
    <Panel className="mb-4">
      {/* `gap-px` on the border colour draws the dividers, so they stay right
          however the grid wraps on a phone. */}
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <Figure label="Total sales" value={rs(summary.total)} className="text-2xl" />
        </div>
        <Figure label="Cash" value={rs(summary.cash)} />
        <Figure label="Online" value={rs(summary.online)} />
      </div>

      {closing ? (
        <div className="grid grid-cols-2 gap-px border-t bg-border sm:grid-cols-4">
          <Figure label="Expected cash" value={rs(closing.expectedCash)} />
          <Figure label="Counted" value={rs(closing.countedCash)} />
          <Figure
            label={difference < 0 ? "Short" : difference > 0 ? "Extra" : "Difference"}
            value={rs(Math.abs(difference))}
            className={cn(difference < 0 && "text-destructive", difference > 0 && "text-warning")}
          />
          <Figure label="Security code" value={closing.securityCode} className="font-mono text-lg" />
        </div>
      ) : null}

      {/* Space, not "·", between the items: on a phone the line wraps, and a
          wrapped line that starts with a dot looks like a stray mark. */}
      <p className="flex flex-wrap gap-x-4 gap-y-1 border-t bg-surface-sunken px-card py-2.5 text-sm text-muted-foreground">
        <span>{plural(summary.paidBills, "paid bill")}</span>
        {summary.cancelledBills > 0 ? (
          <span className="font-medium text-destructive">{summary.cancelledBills} cancelled</span>
        ) : null}
        {summary.editedBills > 0 ? <span>{summary.editedBills} edited</span> : null}
        {/* A discount is meant to stand out (P3.10), and to be read right:
            the sales above are already net of it. */}
        {summary.discount > 0 ? (
          <span>
            <span className="font-medium text-foreground">{rs(summary.discount)} discount</span>, already off the total
          </span>
        ) : null}
      </p>
    </Panel>
  );
}
