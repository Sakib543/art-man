import { DiscountNote } from "@/components/discount-note";
import { Panel } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import type { DayBill } from "@/db/queries/day-bills";
import { formatTime, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReportBill } from "../corrections";
import { CancelClosedBill } from "./cancel-closed-bill";
import { PreviousVersions } from "./previous-versions";

const th = "px-3.5 py-2 text-left text-xs font-medium text-muted-foreground";
// Padding from `md` up only: below it the row is a card, and `.table-stacked`
// (globals.css) sets its own tight spacing — which a plain utility would beat,
// since utilities outrank the components layer.
const td = "align-top md:px-3.5 md:py-3";

/**
 * Only what is out of the ordinary gets a badge (P6.5). A green "Paid" on
 * every row said nothing — paid is what a bill is — and buried the three
 * words that do matter.
 */
function StatusBadges({ bill }: { bill: ReportBill }) {
  return (
    <>
      {bill.status === "cancelled" ? <Badge variant="destructive">Cancelled</Badge> : null}
      {bill.status === "reversal" ? <Badge variant="secondary">Reversal</Badge> : null}
      {bill.previous.length > 0 ? <Badge variant="warning">Edited</Badge> : null}
    </>
  );
}

/** "Cash" or "Online" when it was one of them — the amount is in the next column — and both amounts on a split. */
function paidBy(bill: DayBill): string {
  if (bill.cash !== 0 && bill.online !== 0) return `Cash ${num(bill.cash)} · Online ${num(bill.online)}`;
  if (bill.online !== 0) return "Online";
  if (bill.cash !== 0) return "Cash";
  return "—";
}

/**
 * One row per bill. A cancelled bill and its reversal stay visible, so the
 * mistake does (spec 11); a bill the Owner *corrected* is one row carrying an
 * "Edited" badge, with every earlier version a click away (P1.5).
 *
 * Kept quiet on purpose (P6.5): no customer column full of "Walk-in" — a name
 * shows under the bill number when there is one — and the staff member as
 * plain text beside the service rather than a pill on every line.
 */
export function ReportTable({ bills, canCancel }: { bills: ReportBill[]; canCancel: boolean }) {
  return (
    <Panel>
      {/* Below `md` this is a card per bill, not a sideways scroll. The
          labels come from each cell's `data-label`; see globals.css. */}
      <div className="md:overflow-x-auto">
        <table className="table-stacked w-full text-sm">
          <thead>
            <tr className="border-b bg-surface-sunken">
              <th className={cn(th, "w-44")}>Bill</th>
              <th className={th}>Services and staff</th>
              <th className={th}>Paid by</th>
              <th className={cn(th, "text-right")}>Amount</th>
              {canCancel ? <th className={cn(th, "w-28")} /> : null}
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => {
              const muted = bill.status !== "active";
              return (
                <tr key={bill.id} className={cn("border-b last:border-b-0", muted && "text-muted-foreground")}>
                  <td className={td} data-row-title="">
                    <div>
                      <p className="flex flex-wrap items-center gap-1.5">
                        <span className={cn("font-semibold tabular-nums", !muted && "text-foreground")}>
                          #{bill.billNo}
                        </span>
                        <StatusBadges bill={bill} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(bill.createdAt)}
                        {bill.bookNo ? ` · Book ${bill.bookNo}` : null}
                      </p>
                      {bill.customerName ? <p className="mt-0.5 text-sm">{bill.customerName}</p> : null}
                    </div>
                  </td>
                  <td className={td}>
                    <div className="space-y-0.5">
                      {bill.lines.map((line, index) => (
                        <p key={index}>
                          {line.name} <span className="text-muted-foreground">· {line.staffName}</span>
                        </p>
                      ))}
                      <DiscountNote amount={bill.discount} reason={bill.discountReason} className="flex" />
                      {bill.status === "cancelled" && bill.cancelReason ? (
                        <p className="text-xs">Reason: {bill.cancelReason}</p>
                      ) : null}
                      {bill.status === "reversal" && bill.reversesBillNo ? (
                        <p className="text-xs">Cancels bill #{bill.reversesBillNo}</p>
                      ) : null}
                      {bill.previous.length > 0 ? (
                        <div className="-ml-2">
                          <PreviousVersions billNo={bill.billNo} previous={bill.previous} />
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className={cn(td, "text-muted-foreground tabular-nums")} data-label="Paid by">
                    {paidBy(bill)}
                  </td>
                  <td
                    className={cn(
                      td,
                      "text-right font-semibold tabular-nums",
                      bill.total < 0 && "text-destructive",
                      bill.status === "cancelled" && "font-normal line-through",
                    )}
                    data-label="Amount"
                  >
                    {/* What the services came to before the discount, struck
                        through above what was actually charged (P3.10). */}
                    {bill.discount > 0 ? (
                      <p className="text-xs font-normal text-muted-foreground line-through">
                        {num(bill.total + bill.discount)}
                      </p>
                    ) : null}
                    {num(bill.total)}
                  </td>
                  {canCancel ? (
                    <td className={cn(td, "max-md:pt-2 md:text-right")}>
                      {bill.status === "active" ? <CancelClosedBill billId={bill.id} billNo={bill.billNo} /> : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {bills.length === 0 ? (
              <tr>
                <td colSpan={canCancel ? 5 : 4} className="px-4 py-10 text-center text-muted-foreground">
                  No bills on this day
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="border-t px-card py-3 text-xs text-muted-foreground">
        A cancelled bill stays listed beside the reversal that cancels it; together they come to zero. An edited bill
        is one line, and its earlier versions are a click away.
      </p>
    </Panel>
  );
}
