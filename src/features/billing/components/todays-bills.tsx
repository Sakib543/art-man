"use client";

import { AlertCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatTime, rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DayBill } from "@/db/queries/day-bills";
import { cancelBillAction } from "../actions";

export function TodaysBills({ bills }: { bills: DayBill[] }) {
  // `target` is kept after closing so the dialog does not go blank while it animates out.
  const [target, setTarget] = useState<DayBill | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function openFor(bill: DayBill) {
    setTarget(bill);
    setReason("");
    setError("");
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  function confirmCancel() {
    if (!target) return;
    startTransition(async () => {
      const result = await cancelBillAction({ billId: target.id, reason });
      if (!result.ok) return setError(result.error);
      close();
    });
  }

  return (
    <section className="mt-4 rounded-[14px] border bg-card">
      <div className="flex items-center justify-between border-b px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">Today&apos;s bills</h2>
        <span className="text-[12.5px] text-muted-foreground">{bills.length} entries</span>
      </div>

      {bills.length === 0 ? (
        <p className="px-4 py-8 text-center text-muted-foreground">No bills yet today</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-[#fafbfc] text-left text-[12.5px] text-muted-foreground">
                <th className="px-3.5 py-2 font-medium">Time</th>
                <th className="px-3.5 py-2 font-medium">Bill</th>
                <th className="px-3.5 py-2 font-medium">Customer</th>
                <th className="px-3.5 py-2 font-medium">Items</th>
                <th className="px-3.5 py-2 text-right font-medium">Cash</th>
                <th className="px-3.5 py-2 text-right font-medium">Online</th>
                <th className="px-3.5 py-2 font-medium">Status</th>
                <th className="px-3.5 py-2" />
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id} className={cn("border-b last:border-b-0", bill.status !== "active" && "text-muted-foreground")}>
                  <td className="px-3.5 py-2.5 tabular-nums">{formatTime(bill.createdAt)}</td>
                  <td className="px-3.5 py-2.5 tabular-nums">#{bill.billNo}</td>
                  <td className="px-3.5 py-2.5">{bill.customerName ?? "Walk-in"}</td>
                  <td className="px-3.5 py-2.5">{bill.lines.map((line) => line.name).join(", ")}</td>
                  <td className="px-3.5 py-2.5 text-right tabular-nums">{rs(bill.cash)}</td>
                  <td className="px-3.5 py-2.5 text-right tabular-nums">{rs(bill.online)}</td>
                  <td className="px-3.5 py-2.5">
                    {bill.status === "active" ? <Badge className="bg-success-soft text-success">Active</Badge> : null}
                    {bill.status === "cancelled" ? (
                      <span title={bill.cancelReason ?? ""}>
                        <Badge className="bg-danger-soft text-destructive">Cancelled</Badge>
                      </span>
                    ) : null}
                    {bill.status === "reversal" ? (
                      <Badge className="bg-secondary text-muted-foreground">Reverses #{bill.reversesBillNo}</Badge>
                    ) : null}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    {bill.status === "active" ? (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => openFor(bill)}>
                        Cancel
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={(next) => !next && close()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel bill #{target?.billNo}?</DialogTitle>
            <DialogDescription>
              The bill stays in the record as cancelled and a reversal is added. Nothing is deleted.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason (required), e.g. wrong rate applied"
            aria-label="Reason for cancelling"
            rows={3}
          />
          {error ? (
            <p role="alert" className="flex items-center gap-1.5 text-[12.5px] text-destructive">
              <AlertCircle className="size-4" aria-hidden />
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Keep bill
            </Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={pending}>
              {pending ? "Cancelling..." : "Cancel bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
