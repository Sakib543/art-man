"use client";

import { AlertCircle } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { karachiDate } from "@/lib/business-date";
import { formatDate, num, rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { addDrawingAction, voidDrawingAction } from "../actions";
import type { DrawingRow } from "../types";

interface DrawingsCardProps {
  partnerId: string;
  month: string;
  rows: DrawingRow[];
  closed: boolean;
}

/** Profit the partner took out this month. */
export function DrawingsCard({ partnerId, month, rows, closed }: DrawingsCardProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // `target` is kept after closing so the dialog does not go blank while it animates out.
  const [target, setTarget] = useState<DrawingRow | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [voidError, setVoidError] = useState("");
  const [voiding, startVoid] = useTransition();

  function add(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await addDrawingAction({ partnerId, month, amount: Number(amount) || 0, note });
      if (!result.ok) return setError(result.error);
      setAmount("");
      setNote("");
    });
  }

  function confirmVoid() {
    if (!target) return;
    startVoid(async () => {
      const result = await voidDrawingAction({ drawingId: target.id, reason });
      if (!result.ok) return setVoidError(result.error);
      setOpen(false);
    });
  }

  return (
    <div className="rounded-[14px] border bg-card">
      <div className="border-b px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">Profit drawn</h2>
      </div>

      {!closed ? (
        <form onSubmit={add} className="space-y-2.5 border-b px-[18px] py-4" noValidate>
          <div className="flex flex-wrap gap-2">
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              aria-label="Amount drawn"
              className="h-10 w-36 tabular-nums"
            />
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" aria-label="Note" className="h-10 min-w-40 flex-1" />
            <Button type="submit" className="h-10" disabled={pending}>
              {pending ? "..." : "Record"}
            </Button>
          </div>
          {error ? (
            <p role="alert" className="flex items-center gap-1.5 text-[12.5px] text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
        </form>
      ) : null}

      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={cn("border-b last:border-b-0", (row.voided || row.isVoid) && "text-muted-foreground")}>
              <td className="px-[18px] py-2.5">{formatDate(karachiDate(row.createdAt))}</td>
              <td className={cn("px-[18px] py-2.5", row.voided && "line-through")}>
                {row.note}
                {row.voided ? <Badge className="ml-2 bg-danger-soft text-destructive">Cancelled</Badge> : null}
              </td>
              <td className={cn("px-[18px] py-2.5 text-right tabular-nums", row.voided && "line-through")}>{num(row.amount)}</td>
              <td className="px-[18px] py-2.5 text-right">
                {!closed && !row.voided && !row.isVoid ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      setTarget(row);
                      setReason("");
                      setVoidError("");
                      setOpen(true);
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-muted-foreground">Nothing drawn this month</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel this entry?</DialogTitle>
            <DialogDescription>{target ? `${rs(target.amount)}. ` : ""}It stays in the record as cancelled. Nothing is deleted.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" aria-label="Reason for cancelling" rows={3} />
          {voidError ? (
            <p role="alert" className="flex items-center gap-1.5 text-[12.5px] text-destructive">
              <AlertCircle className="size-4" aria-hidden />
              {voidError}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep entry
            </Button>
            <Button variant="destructive" onClick={confirmVoid} disabled={voiding}>
              {voiding ? "Cancelling..." : "Cancel entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
