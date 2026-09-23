"use client";

import { Panel, PanelHeader } from "@/components/panel";
import { AlertCircle } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Field } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { PaidFrom } from "@/lib/accounting";
import { karachiDate } from "@/lib/business-date";
import { formatDate, num, rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { addOtherAction, voidOtherAction } from "../actions";
import type { OtherRow } from "../types";

interface OthersCardProps {
  month: string;
  rows: OtherRow[];
  total: number;
  closed: boolean;
}

export function OthersCard({ month, rows, total, closed }: OthersCardProps) {
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [paidFrom, setPaidFrom] = useState<PaidFrom>("drawer");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // `target` is kept after closing so the dialog does not go blank while it animates out.
  const [target, setTarget] = useState<OtherRow | null>(null);
  const [open, setOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState("");
  const [voiding, startVoid] = useTransition();

  function add(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await addOtherAction({ month, reason, amount: Number(amount) || 0, paidFrom });
      if (!result.ok) return setError(result.error);
      setReason("");
      setAmount("");
    });
  }

  function confirmVoid() {
    if (!target) return;
    startVoid(async () => {
      const result = await voidOtherAction({ entryId: target.id, reason: voidReason });
      if (!result.ok) return setVoidError(result.error);
      setOpen(false);
    });
  }

  return (
    <Panel>
      <PanelHeader title="Others" />

      {!closed ? (
        <form onSubmit={add} className="space-y-3 border-b px-card py-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Field label="Reason (required)" htmlFor="other-reason">
              <Input id="other-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Chair repair" className="h-10" />
            </Field>
            <Field label="Amount (Rs)" htmlFor="other-amount">
              <Input
                id="other-amount"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="4000"
                className="h-10 tabular-nums"
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Paid from" htmlFor="other-paid-from">
              <NativeSelect id="other-paid-from" className="w-56" value={paidFrom} onChange={(e) => setPaidFrom(e.target.value as PaidFrom)}>
                <NativeSelectOption value="drawer">The business</NativeSelectOption>
                <NativeSelectOption value="owner">Owner&apos;s pocket or bank</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding..." : "Add"}
            </Button>
          </div>
          {error ? (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
        </form>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-surface-sunken text-left text-xs text-muted-foreground">
              <th className="px-card py-2 font-medium">Date</th>
              <th className="px-card py-2 font-medium">Reason</th>
              <th className="px-card py-2 text-right font-medium">Amount</th>
              <th className="px-card py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={cn("border-b", (row.voided || row.isVoid) && "text-muted-foreground")}>
                <td className="px-card py-2.5">{formatDate(karachiDate(row.createdAt))}</td>
                <td className={cn("px-card py-2.5", row.voided && "line-through")}>
                  {row.reason}
                  {row.paidFrom === "owner" ? <span className="text-xs text-muted-foreground"> (paid by Owner)</span> : null}
                  {row.voided ? <Badge variant="destructive" className="ml-2">Cancelled</Badge> : null}
                </td>
                <td className={cn("px-card py-2.5 text-right font-medium tabular-nums", row.voided && "line-through")}>{num(row.amount)}</td>
                <td className="px-card py-2.5 text-right">
                  {!closed && !row.voided && !row.isVoid ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        setTarget(row);
                        setVoidReason("");
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
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No other expenses yet
                </td>
              </tr>
            ) : null}
            <tr className="bg-brass-tint font-semibold">
              <td className="px-card py-2.5" />
              <td className="px-card py-2.5">Total others</td>
              <td className="px-card py-2.5 text-right tabular-nums">{rs(total)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel this expense?</DialogTitle>
            <DialogDescription>
              {target ? `${target.reason}, ${rs(target.amount)}. ` : ""}It stays in the record as cancelled. Nothing is deleted.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="Reason (required), e.g. entered twice"
            aria-label="Reason for cancelling"
            rows={3}
          />
          {voidError ? (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-4" aria-hidden />
              {voidError}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep expense
            </Button>
            <Button variant="destructive" onClick={confirmVoid} disabled={voiding}>
              {voiding ? "Cancelling..." : "Cancel expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
