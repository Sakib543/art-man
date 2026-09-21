"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatTime, num, rs } from "@/lib/format";
import type { Receipt } from "../types";

interface ReceiptDialogProps {
  /** Kept after closing so the dialog does not go blank while it animates out. */
  receipt: Receipt | null;
  open: boolean;
  onClose: () => void;
}

export function ReceiptDialog({ receipt, open, onClose }: ReceiptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm">
        {receipt ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-success-soft text-success">
                  <Check className="size-4" aria-hidden />
                </span>
                Bill #{receipt.billNo} saved
              </DialogTitle>
              <DialogDescription>Receipt printing is not connected yet.</DialogDescription>
            </DialogHeader>

            <div className="mx-auto w-full rounded-md border bg-white p-4 font-mono text-[12.5px] leading-relaxed">
              <p className="text-center font-medium">Art Men&apos;s Salon</p>
              <p className="text-center text-muted-foreground">
                {formatDate(receipt.businessDate)}, {formatTime(receipt.createdAt)}
              </p>
              <hr className="my-2 border-dashed" />
              <p>Bill #{receipt.billNo}</p>
              {receipt.customerName ? <p>Customer: {receipt.customerName}</p> : null}
              <hr className="my-2 border-dashed" />
              {receipt.lines.map((line, index) => (
                <div key={index} className="flex justify-between gap-2">
                  <span>
                    {line.name}
                    <span className="text-muted-foreground"> ({line.staffName})</span>
                  </span>
                  <span className="tabular-nums">{num(line.amount)}</span>
                </div>
              ))}
              <hr className="my-2 border-dashed" />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span className="tabular-nums">{rs(receipt.total)}</span>
              </div>
              {receipt.cash > 0 ? (
                <div className="flex justify-between">
                  <span>Cash</span>
                  <span className="tabular-nums">{num(receipt.cash)}</span>
                </div>
              ) : null}
              {receipt.online > 0 ? (
                <div className="flex justify-between">
                  <span>Online</span>
                  <span className="tabular-nums">{num(receipt.online)}</span>
                </div>
              ) : null}
              <hr className="my-2 border-dashed" />
              <p className="text-center">Thank you</p>
            </div>

            <DialogFooter>
              <Button className="h-10 w-full" onClick={onClose}>
                New bill
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
