"use client";

import { AlertCircle } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { PaidFrom } from "@/lib/accounting";
import { cn } from "@/lib/utils";
import { addEntryAction } from "../actions";
import type { StaffOption } from "../types";

type FormKind = "expense" | "staff_advance" | "owner_took" | "owner_added";

const KIND_LABEL: Record<FormKind, string> = {
  expense: "Expense",
  staff_advance: "Staff advance",
  owner_took: "Owner took cash",
  owner_added: "Owner added cash",
};

export function EntryForm({ staff }: { staff: StaffOption[] }) {
  const [kind, setKind] = useState<FormKind>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paidFrom, setPaidFrom] = useState<PaidFrom>("drawer");
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const needsPin = kind !== "expense";
  const pinOwner = kind === "staff_advance" ? `${staff.find((s) => s.id === staffId)?.name ?? "Staff"}'s PIN` : "Owner's PIN";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const base = { kind, amount: Number(amount) || 0 };
    const payload =
      kind === "expense"
        ? { ...base, description, paidFrom }
        : kind === "staff_advance"
          ? { ...base, staffId, pin }
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
    <div className="rounded-[14px] border bg-card">
      <div className="border-b px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">New entry</h2>
      </div>
      <form onSubmit={submit} className="space-y-3.5 px-[18px] py-4" noValidate>
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
              className="h-10"
            />
          </Field>
        )}

        {kind === "expense" ? (
          <div className="space-y-1.5">
            <p className="text-[12.5px] font-medium text-muted-foreground">Paid from</p>
            <div className="grid grid-cols-2 gap-0.5 rounded-[9px] bg-secondary p-[3px]" role="radiogroup">
              {(
                [
                  ["drawer", "Cash drawer"],
                  ["owner", "Owner's pocket or bank"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={paidFrom === value}
                  onClick={() => setPaidFrom(value)}
                  className={cn(
                    "min-h-9 rounded-[7px] px-2 text-[13.5px]",
                    paidFrom === value ? "bg-white font-medium shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
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
            label={`${pinOwner} to confirm`}
            htmlFor="entry-pin"
            hint="The person receiving or giving the cash confirms with their own PIN."
          >
            <Input
              id="entry-pin"
              type="password"
              inputMode="numeric"
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
          <p role="alert" className="flex items-center gap-1.5 text-[12.5px] text-destructive">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <Button type="submit" className="h-11 w-full text-[15px]" disabled={pending}>
          {pending ? "Saving..." : "Save entry"}
        </Button>
      </form>
    </div>
  );
}
