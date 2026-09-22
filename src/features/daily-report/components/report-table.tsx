import { Badge } from "@/components/ui/badge";
import type { DayBill } from "@/db/queries/day-bills";
import { formatTime, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CancelClosedBill } from "./cancel-closed-bill";

const th = "px-3.5 py-2 text-left text-[12.5px] font-medium text-muted-foreground";
const td = "px-3.5 py-2.5 align-top";

function StatusBadge({ bill }: { bill: DayBill }) {
  if (bill.status === "cancelled") return <Badge className="bg-danger-soft text-destructive">Cancelled</Badge>;
  if (bill.status === "reversal") return <Badge className="bg-secondary text-muted-foreground">Reversal</Badge>;
  return <Badge className="bg-success-soft text-success">Paid</Badge>;
}

/** Every bill of the day, cancelled ones and reversals included, so the mistake stays visible. */
export function ReportTable({ bills, canCancel }: { bills: DayBill[]; canCancel: boolean }) {
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
                  {bill.status === "cancelled" && bill.cancelReason ? (
                    <p className="mt-1 text-[12.5px] text-muted-foreground">Reason: {bill.cancelReason}</p>
                  ) : null}
                  {bill.status === "reversal" && bill.reversesBillNo ? (
                    <p className="mt-1 text-[12.5px] text-muted-foreground">Cancels bill #{bill.reversesBillNo}</p>
                  ) : null}
                </td>
                <td className={cn(td, "text-[13px] text-muted-foreground tabular-nums")}>
                  {bill.cash !== 0 ? <p>Cash {num(bill.cash)}</p> : null}
                  {bill.online !== 0 ? <p>Online {num(bill.online)}</p> : null}
                </td>
                <td className={cn(td, "text-right font-medium tabular-nums", bill.total < 0 && "text-destructive")}>
                  {num(bill.total)}
                </td>
                <td className={cn(td, "text-right")}>
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
        Totals include every line, cancelled bills and reversals too. The mistake stays visible and the total stays correct.
      </p>
    </div>
  );
}
