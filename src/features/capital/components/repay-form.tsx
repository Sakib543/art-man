"use client";

import { AlertCircle } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { addRepaymentAction } from "../actions";
import type { FunderRow } from "../types";

/** Record an installment paid back to a partner who is still owed money. */
export function RepayForm({ capitalItemId, owed, nextNumber }: { capitalItemId: string; owed: FunderRow[]; nextNumber: number }) {
  const [partnerId, setPartnerId] = useState(owed[0]?.partnerId ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await addRepaymentAction({ capitalItemId, partnerId, amount: Number(amount) || 0, note });
      if (!result.ok) return setError(result.error);
      setAmount("");
      setNote("");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2.5 border-t px-card py-4" noValidate>
      <Label>Record an installment</Label>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <NativeSelect aria-label="Paid to" className="w-full" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
          {owed.map((funder) => (
            <NativeSelectOption key={funder.partnerId} value={funder.partnerId}>
              {funder.partnerName}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Input
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          aria-label="Installment amount"
          className="h-8 tabular-nums"
        />
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Installment ${nextNumber}`} aria-label="Note" className="h-8" />
        <Button type="submit" size="sm" className="h-8" disabled={pending}>
          {pending ? "..." : "Record"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Paid from business cash. It lowers what the business owes the partner. It is not an expense and not profit.
      </p>
    </form>
  );
}
