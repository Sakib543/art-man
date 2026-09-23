"use client";

import { Panel, PanelHeader } from "@/components/panel";
import { PasswordInput } from "@/components/password-input";
import { AlertCircle } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Field } from "@/components/field";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { PaidFrom } from "@/lib/accounting";
import { addEntryAction } from "../actions";
import type { StaffOption } from "../types";

type FormKind = "expense" | "staff_advance" | "owner_took" | "owner_added";

const KIND_LABEL: Record<FormKind, string> = {
  expense: "Expense",
  staff_advance: "Staff advance",
  owner_took: "Owner took cash",
  owner_added: "Owner added cash",
};

const PAID_FROM = [
  { value: "drawer", label: "Cash drawer" },
  { value: "owner", label: "Owner's pocket or bank" },
] as const;

export function EntryForm({ staff }: { staff: StaffOption[] }) {
  const [kind, setKind] = useState<FormKind>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paidFrom, setPaidFrom] = useState<PaidFrom>("drawer");
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // Only the Owner's own cash movements are confirmed with a PIN. Staff PINs were removed.
  const needsPin = kind === "owner_took" || kind === "owner_added";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const base = { kind, amount: Number(amount) || 0 };
    const payload =
      kind === "expense"
        ? { ...base, description, paidFrom }
        : kind === "staff_advance"
          ? { ...base, staffId }
          : { ...base, description, pin };

    startTransition(async () => {
      const result = await addEntryAction(payload);
      if (!result.ok) return setError(result.error);
      setAmount("");
      setDescription("");
      setPin("");
    });
  }

  return (
    <Panel>
      <PanelHeader title="New entry" />
      <form onSubmit={submit} className="space-y-3.5 px-card py-4" noValidate>
        <Field label="Folder" htmlFor="entry-kind">
          <NativeSelect
            id="entry-kind"
            className="w-full"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as FormKind);
              setPin("");
              setError("");
            }}
          >
            {(Object.keys(KIND_LABEL) as FormKind[]).map((k) => (
              <NativeSelectOption key={k} value={k}>
                {KIND_LABEL[k]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        {kind === "staff_advance" ? (
          <Field label="Staff member" htmlFor="entry-staff">
            <NativeSelect id="entry-staff" className="w-full" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              {staff.map((member) => (
                <NativeSelectOption key={member.id} value={member.id}>
                  {member.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        ) : (
          <Field
            label={kind === "expense" ? "Description" : "Purpose"}
            htmlFor="entry-description"
          >
            <Input
              id="entry-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                kind === "expense" ? "Tea, lunch, towels" : kind === "owner_took" ? "Bank deposit" : "Change for the drawer"
              }
            />
          </Field>
        )}

        {kind === "expense" ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Paid from</p>
            <Segmented label="Paid from" value={paidFrom} onChange={setPaidFrom} options={PAID_FROM} />
          </div>
        ) : null}

        <Field label="Amount (Rs)" htmlFor="entry-amount">
          <Input
            id="entry-amount"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500"
            className="h-10 tabular-nums"
          />
        </Field>

        {needsPin ? (
          <Field
            label="Owner's PIN to confirm"
            htmlFor="entry-pin"
            hint="The Owner confirms cash taken from or added to the drawer with their own PIN."
          >
            <PasswordInput id="entry-pin" inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="4-digit PIN"
              className="h-10 tracking-widest"
            />
          </Field>
        ) : null}

        {error ? (
          <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Saving..." : "Save entry"}
        </Button>
      </form>
    </Panel>
  );
}
