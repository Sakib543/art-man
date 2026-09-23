import { DiscountNote } from "@/components/discount-note";
import { Badge } from "@/components/ui/badge";
import type { DayBill } from "@/db/queries/day-bills";
import { formatTime, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReportBill } from "../corrections";
import { CancelClosedBill } from "./cancel-closed-bill";
import { PreviousVersions } from "./previous-versions";

const th = "px-3.5 py-2 text-left text-[12.5px] font-medium text-muted-foreground";
const td = "px-3.5 py-2.5 align-top";

function StatusBadge({ bill }: { bill: DayBill }) {
  if (bill.status === "cancelled") return <Badge className="bg-danger-soft text-destructive">Cancelled</Badge>;
  if (bill.status === "reversal") return <Badge className="bg-secondary text-muted-foreground">Reversal</Badge>;
  return <Badge className="bg-success-soft text-success">Paid</Badge>;
}

/**
 * One row per bill. A cancelled bill and its reversal stay visible, so the
 * mistake does (spec 11); a bill the Owner *corrected* is one row carrying an
 * "Edited" badge, with every earlier version a click away (P1.5).
 */
export function ReportTable({ bills, canCancel }: { bills: ReportBill[]; canCancel: boolean }) {
  return (
    <div className="rounded-[14px] border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#fafbfc]">
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
                <td className={td}>
                  <p className="font-medium tabular-nums">#{bill.billNo}</p>
                  {bill.bookNo ? (
                    <p className="text-[12.5px] text-muted-foreground">Book {bill.bookNo}</p>
                  ) : null}
                  <p className="text-[12.5px] text-muted-foreground">{formatTime(bill.createdAt)}</p>
                </td>
                <td className={td}>{bill.customerName ?? "Walk-in"}</td>
                <td className={cn(td, "text-[13px]")}>
                  {bill.lines.map((line, index) => (
                    <p key={index}>
                      {line.name} <Badge className="ml-1 bg-secondary text-muted-foreground">{line.staffName}</Badge>
                    </p>
                  ))}
                  <DiscountNote amount={bill.discount} reason={bill.discountReason} className="mt-1 flex" />
                  {bill.status === "cancelled" && bill.cancelReason ? (
                    <p className="mt-1 text-[12.5px] text-muted-foreground">Reason: {bill.cancelReason}</p>
                  ) : null}
                  {bill.status === "reversal" && bill.reversesBillNo ? (
                    <p className="mt-1 text-[12.5px] text-muted-foreground">Cancels bill #{bill.reversesBillNo}</p>
                  ) : null}
                  {bill.previous.length > 0 ? (
                    <div className="mt-1 -ml-2">
                      <PreviousVersions billNo={bill.billNo} previous={bill.previous} />
                    </div>
                  ) : null}
                </td>
                <td className={cn(td, "text-[13px] text-muted-foreground tabular-nums")}>
                  {bill.cash !== 0 ? <p>Cash {num(bill.cash)}</p> : null}
                  {bill.online !== 0 ? <p>Online {num(bill.online)}</p> : null}
                </td>
                <td className={cn(td, "text-right font-medium tabular-nums", bill.total < 0 && "text-destructive")}>
                  {/* What the services came to before the discount, struck
                      through above what was actually charged (P3.10). */}
                  {bill.discount > 0 ? (
                    <p className="text-[12.5px] font-normal text-muted-foreground line-through">
                      {num(bill.total + bill.discount)}
                    </p>
                  ) : null}
                  {num(bill.total)}
                </td>
                <td className={cn(td, "text-right")}>
                  {bill.previous.length > 0 ? (
                    <Badge className="mr-1 bg-warning-soft text-warning">Edited</Badge>
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
      <p className="border-t px-[18px] py-3 text-[12.5px] text-muted-foreground">
        Totals include every line, cancelled bills and reversals too. A corrected bill shows as one line marked
        Edited; its earlier versions are still in the record and the totals already account for them.
      </p>
    </div>
  );
}
