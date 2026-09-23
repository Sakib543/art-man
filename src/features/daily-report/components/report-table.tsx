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
const td = "px-3.5 py-2.5 align-top";

function StatusBadge({ bill }: { bill: DayBill }) {
  if (bill.status === "cancelled") return <Badge variant="destructive">Cancelled</Badge>;
  if (bill.status === "reversal") return <Badge variant="secondary">Reversal</Badge>;
  return <Badge variant="success">Paid</Badge>;
}

/**
 * One row per bill. A cancelled bill and its reversal stay visible, so the
 * mistake does (spec 11); a bill the Owner *corrected* is one row carrying an
 * "Edited" badge, with every earlier version a click away (P1.5).
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
              <th className={cn(th, "w-32")}>Bill</th>
              <th className={th}>Customer</th>
              <th className={th}>Services and staff</th>
              <th className={th}>Payment</th>
              <th className={cn(th, "text-right")}>Amount</th>
              <th className={cn(th, "w-32 text-right")}>Status</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.id} className="border-b last:border-b-0">
                <td className={td} data-row-title="">
                  <p className="font-medium tabular-nums">#{bill.billNo}</p>
                  {bill.bookNo ? (
                    <p className="text-xs text-muted-foreground">Book {bill.bookNo}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{formatTime(bill.createdAt)}</p>
                </td>
                <td className={td} data-label="Customer">
                  {bill.customerName ?? "Walk-in"}
                </td>
                <td className={cn(td, "text-sm")}>
                  {bill.lines.map((line, index) => (
                    <p key={index}>
                      {line.name} <Badge variant="secondary" className="ml-1">{line.staffName}</Badge>
                    </p>
                  ))}
                  <DiscountNote amount={bill.discount} reason={bill.discountReason} className="mt-1 flex" />
                  {bill.status === "cancelled" && bill.cancelReason ? (
                    <p className="mt-1 text-xs text-muted-foreground">Reason: {bill.cancelReason}</p>
                  ) : null}
                  {bill.status === "reversal" && bill.reversesBillNo ? (
                    <p className="mt-1 text-xs text-muted-foreground">Cancels bill #{bill.reversesBillNo}</p>
                  ) : null}
                  {bill.previous.length > 0 ? (
                    <div className="mt-1 -ml-2">
                      <PreviousVersions billNo={bill.billNo} previous={bill.previous} />
                    </div>
                  ) : null}
                </td>
                <td className={cn(td, "text-sm text-muted-foreground tabular-nums")} data-label="Paid">
                  {bill.cash !== 0 ? <p>Cash {num(bill.cash)}</p> : null}
                  {bill.online !== 0 ? <p>Online {num(bill.online)}</p> : null}
                </td>
                <td
                  className={cn(td, "text-right font-medium tabular-nums", bill.total < 0 && "text-destructive")}
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
                <td className={cn(td, "text-right max-md:pt-2")} data-label="Status">
                  {bill.previous.length > 0 ? (
                    <Badge variant="warning" className="mr-1">Edited</Badge>
                  ) : null}
                  <StatusBadge bill={bill} />
                  {canCancel && bill.status === "active" ? (
                    <div className="mt-1.5">
                      <CancelClosedBill billId={bill.id} billNo={bill.billNo} />
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
            {bills.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No bills on this day
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="border-t px-card py-3 text-xs text-muted-foreground">
        Totals include every line, cancelled bills and reversals too. A corrected bill shows as one line marked
        Edited; its earlier versions are still in the record and the totals already account for them.
      </p>
    </Panel>
  );
}
