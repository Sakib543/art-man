"use client";

import { Check, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatTime, num, rs } from "@/lib/format";
import type { Receipt } from "../types";

interface ReceiptDialogProps {
  /** Kept after closing so the dialog does not go blank while it animates out. */
  receipt: Receipt | null;
  open: boolean;
  onClose: () => void;
  /**
   * What the closing button says. The default suits the billing screen, where
   * closing the receipt starts the next bill; a reprint only closes.
   */
  closeLabel?: string;
  /** False when the slip is being reprinted, so the heading does not claim a sale just happened. */
  justSaved?: boolean;
}

/**
 * The customer's receipt, on screen and on paper (backlog P3.6). Printing is
 * plain `window.print()`: the rules in globals.css hide everything except the
 * element marked `data-print-receipt`, so the browser prints this same markup
 * rather than a second copy built for paper that could drift out of step.
 */
export function ReceiptDialog({
  receipt,
  open,
  onClose,
  closeLabel = "New bill",
  justSaved = true,
}: ReceiptDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {/*
        On screen the dialog is fixed and centred; on paper it has to be an
        ordinary block at the top of the sheet. These are utilities rather than
        rules in globals.css so that Tailwind orders them against its own
        centring classes — see the note there.
      */}
      <DialogContent className="max-w-sm print:static print:block print:max-w-none print:translate-none print:p-0 print:ring-0 print:shadow-none">
        {receipt ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {justSaved ? (
                  <span className="grid size-6 place-items-center rounded-full bg-success-soft text-success">
                    <Check className="size-4" aria-hidden />
                  </span>
                ) : null}
                {justSaved ? `Bill #${receipt.billNo} saved` : `Receipt for bill #${receipt.billNo}`}
              </DialogTitle>
              <DialogDescription>Print it for the customer, or close to carry on.</DialogDescription>
            </DialogHeader>

            {/*
              The marker printing keys off, and only while the dialog is open.
              A dialog takes about a second to animate out, and a second
              receipt opened in that window would otherwise put two slips on
              one sheet.
            */}
            <div
              data-print-receipt={open ? "" : undefined}
              className="mx-auto w-full rounded-md border bg-white p-4 font-mono text-[12.5px] leading-relaxed"
            >
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
              {/*
                The prices above are already net of the discount — it is shared
                across the lines when the cart is priced (P3.10) — so the slip
                says so in words rather than printing a subtraction that the
                listed amounts would contradict.
              */}
              {receipt.discount > 0 ? (
                <div className="text-[11.5px] text-muted-foreground">
                  Includes a discount of {rs(receipt.discount)} ({num(receipt.subtotal)} before)
                </div>
              ) : null}
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
              <Button variant="outline" className="h-10 w-full sm:w-auto" onClick={() => window.print()}>
                <Printer aria-hidden />
                Print
              </Button>
              <Button className="h-10 w-full sm:w-auto" onClick={onClose}>
                {closeLabel}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
