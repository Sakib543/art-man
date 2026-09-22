"use client";

import { AlertCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cancelClosedBillAction } from "../actions";

/** Owner only, and only on a day that is already closed. Today's bills are cancelled from Billing. */
export function CancelClosedBill({ billId, billNo }: { billId: string; billNo: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError("");
    startTransition(async () => {
      const result = await cancelClosedBillAction({ billId, reason });
      if (!result.ok) return setError(result.error);
      setOpen(false);
    });
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-8 px-2.5 text-[12.5px]"
        onClick={() => {
          setReason("");
          setError("");
          setOpen(true);
        }}
      >
        Cancel
      </Button>

      <Dialog open={open} onOpenChange={(next) => !next && setOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel bill #{billNo}?</DialogTitle>
            <DialogDescription>
              This day is already closed. The bill stays in the record as cancelled, a reversal is added, and the day&apos;s
              figures and security code are worked out again to match.
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
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep bill
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={pending}>
              {pending ? "Cancelling..." : "Cancel bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
