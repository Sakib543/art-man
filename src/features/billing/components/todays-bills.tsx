"use client";

import { AlertCircle, Printer } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatTime, rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DayBill } from "@/db/queries/day-bills";
import { cancelBillAction } from "../actions";
import { receiptOfBill } from "../receipt-of-bill";
import type { Receipt } from "../types";
import { ReceiptDialog } from "./receipt-dialog";

interface TodaysBillsProps {
  bills: DayBill[];
  /** The open day. A bill carries the time it was rung up, not the day it belongs to. */
  businessDate: string;
  /** Only the Owner may correct a bill, and only on the day that is still open (P1.4). */
  canEdit?: boolean;
  /** The bill already open for correction on the screen above. */
  editingId?: string | null;
}

export function TodaysBills({ bills, businessDate, canEdit = false, editingId = null }: TodaysBillsProps) {
  // `target` is kept after closing so the dialog does not go blank while it animates out.
  const [target, setTarget] = useState<DayBill | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  // Reprinting a slip the customer asked for again, or that the printer ate
  // the first time (backlog P3.6). Kept after closing for the same reason
  // `target` is: the dialog must not go blank while it animates out.
  const [reprint, setReprint] = useState<Receipt | null>(null);
  const [reprintOpen, setReprintOpen] = useState(false);

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
                  <td className="px-3.5 py-2.5 tabular-nums">
                    #{bill.billNo}
                    {bill.bookNo ? <span className="block text-[12.5px] text-muted-foreground">Book {bill.bookNo}</span> : null}
                  </td>
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
                  <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                    {bill.status === "active" && canEdit ? (
                      editingId === bill.id ? (
                        <Badge className="bg-secondary text-muted-foreground">Correcting</Badge>
                      ) : (
                        <Link href={`/billing?edit=${bill.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                          Edit
                        </Link>
                      )
                    ) : null}
                    {bill.status === "active" ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Print the receipt for bill #${bill.billNo}`}
                          onClick={() => {
                            setReprint(receiptOfBill(bill, businessDate));
                            setReprintOpen(true);
                          }}
                        >
                          <Printer aria-hidden />
                          Print
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => openFor(bill)}>
                          Cancel
                        </Button>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReceiptDialog
        receipt={reprint}
        open={reprintOpen}
        onClose={() => setReprintOpen(false)}
        closeLabel="Done"
        justSaved={false}
      />

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
