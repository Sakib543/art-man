"use client";

import { Printer } from "lucide-react";
import { SalonLogo } from "@/components/salon-logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateLong, formatDateTime, formatTime, num } from "@/lib/format";
import type { SnapshotRow } from "../types";

interface CloseSlipDialogProps {
  snapshot: SnapshotRow;
  open: boolean;
  /** When the slip was opened, for its "Printed" line: set when the button is pressed, never during a render. */
  openedAt: string;
  onClose: () => void;
}

/**
 * The close slip (backlog P7.8b, QA-26): the day's figures and its security
 * code on paper, printed when the day closes and kept for the Owner. It is the
 * copy of the code that the database cannot reach. Someone able to change the
 * database could change a closed day and work its code out again, and the
 * Security codes screen would show the new code as matching; the slip still
 * has the code the day closed with.
 *
 * Printed the way the receipt is (P3.6): `window.print()`, and the rules in
 * globals.css keep only the element marked `data-print-receipt`, sized for an
 * 80mm roll.
 */
export function CloseSlipDialog({ snapshot, open, openedAt, onClose }: CloseSlipDialogProps) {
  const { difference } = snapshot;
  const row = (label: string, amount: number, indent = false) => (
    <div className="flex justify-between gap-2">
      <span className={indent ? "pl-3" : undefined}>{label}</span>
      <span className="tabular-nums">{num(amount)}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm print:static print:block print:max-w-none print:translate-none print:p-0 print:ring-0 print:shadow-none">
        <DialogHeader>
          <DialogTitle>Close slip</DialogTitle>
          <DialogDescription>Print it and keep it for the Owner, with the day&apos;s security code on it.</DialogDescription>
        </DialogHeader>

        {/* The marker printing keys off, only while open — as on the receipt, so two slips never share a sheet. */}
        <div
          data-print-receipt={open ? "" : undefined}
          className="mx-auto w-full rounded-md border bg-card p-4 font-mono text-xs leading-relaxed"
        >
          <SalonLogo unoptimized className="mx-auto mb-2 h-12" />
          <p className="text-center font-medium">Day close</p>
          <p className="text-center text-muted-foreground">{formatDateLong(snapshot.businessDate)}</p>
          <p className="text-center text-muted-foreground">Closed at {formatTime(snapshot.closedAt)}</p>
          <hr className="my-2 border-dashed" />
          {row("Sale", snapshot.sale)}
          {row("Cash", snapshot.cash, true)}
          {row("Online", snapshot.online, true)}
          {row("Expenses", snapshot.expenses)}
          {row("Staff earnings", snapshot.staffEarned)}
          {row("Paid to staff today", snapshot.staffPaid)}
          {row("Day profit", snapshot.dayProfit)}
          <hr className="my-2 border-dashed" />
          {row("Opening cash", snapshot.openingCash)}
          {row("Expected in drawer", snapshot.expectedCash)}
          {row("Counted", snapshot.countedCash)}
          {row(difference < 0 ? "Short" : difference > 0 ? "Extra" : "Difference", Math.abs(difference))}
          {snapshot.diffReason ? <p className="text-muted-foreground">Reason: {snapshot.diffReason}</p> : null}
          <hr className="my-2 border-dashed" />
          <p className="text-center">Security code</p>
          {/* One line, as on every screen: a code broken at its dashes is harder to read out and compare. */}
          <p className="text-center text-base font-bold tracking-[2px] whitespace-nowrap">{snapshot.securityCode}</p>
          <hr className="my-2 border-dashed" />
          <p className="text-center text-2xs text-muted-foreground">
            Keep this slip for the Owner. The Security codes screen must show this code for this day, unless the day
            was corrected after it closed.
          </p>
          <p className="mt-1 text-center text-2xs text-muted-foreground">Printed {formatDateTime(openedAt)}</p>
        </div>

        <DialogFooter>
          <Button variant="outline" className="w-full sm:w-auto" onClick={onClose}>
            Close
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => window.print()}>
            <Printer aria-hidden />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
