"use client";

import { FilePen } from "lucide-react";
import { useState } from "react";
import { Field } from "@/components/field";
import { FormDialog } from "@/components/form-dialog";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useSaveId } from "@/components/use-save-id";
import { adjustmentEffect, type AdjustmentKind, type PaidFrom } from "@/lib/accounting";
import { formatMonth } from "@/lib/business-date";
import { rs } from "@/lib/format";
import { recordAdjustmentAction } from "../actions";
import { directionQuestion, isStaffKind, KIND_CHOICES, signedAmount } from "../rules";
import type { StaffChoice } from "../types";

interface RecordAdjustmentProps {
  /** The closed month being corrected, "2026-09". */
  month: string;
  /** The open month it will count in, "2026-10". */
  countsIn: string;
  staff: StaffChoice[];
}

const PLACEHOLDER: Record<AdjustmentKind, string> = {
  sale: "Bill #45 on 12 Sep was Rs 500, not Rs 1,500",
  expense: "Electricity bill for September came late",
  staff_earning: "Commission on bill #45 was worked out on Rs 1,500",
  staff_taken: "Advance on 20 Sep was entered twice",
};

/**
 * The Owner puts right a mistake found in a closed month (backlog P3.4, spec
 * §7.4). The closed month is not touched: the adjustment counts in the month
 * that is open, and the dialog says so before anything is saved, with what it
 * will do to that month's profit and to the khata.
 */
export function RecordAdjustment({ month, countsIn, staff }: RecordAdjustmentProps) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AdjustmentKind>("sale");
  // No direction to start with: "more" or "less" is the one answer that turns
  // the whole thing round, so the Owner picks it rather than accepting it.
  const [direction, setDirection] = useState<"more" | "less" | "">("");
  const [amount, setAmount] = useState("");
  const [online, setOnline] = useState(false);
  const [paidFrom, setPaidFrom] = useState<PaidFrom>("drawer");
  const [staffId, setStaffId] = useState("");
  const [reason, setReason] = useState("");
  // The same until the adjustment is saved or the dialog is closed (P7.2).
  const [saveId, nextSaveId] = useSaveId();

  function close() {
    setOpen(false);
    setKind("sale");
    setDirection("");
    setAmount("");
    setOnline(false);
    setPaidFrom("drawer");
    setStaffId("");
    setReason("");
    nextSaveId();
  }

  const choice = KIND_CHOICES.find((c) => c.value === kind) ?? KIND_CHOICES[0];
  const staffName = staff.find((member) => member.id === staffId)?.name ?? null;
  const rupees = Math.trunc(Number(amount)) || 0;
  const effect =
    direction && rupees > 0
      ? adjustmentEffect({ kind, amount: signedAmount(direction, rupees), online, paidFrom })
      : null;

  return (
    <>
      <Button variant="outline" className="h-9 bg-card" onClick={() => setOpen(true)}>
        <FilePen className="size-4" aria-hidden />
        Record an adjustment
      </Button>

      <FormDialog
        open={open}
        title={`Adjustment for ${formatMonth(month)}`}
        description={`${formatMonth(month)} stays exactly as it was closed. This counts in ${formatMonth(countsIn)} instead: in its profit, and so in the partners' shares. Nothing is paid or put in the drawer: money that changes hands now goes in Daily folders.`}
        submitLabel="Record adjustment"
        onClose={close}
        savesOnce
        onSubmit={() =>
          recordAdjustmentAction({
            correctsMonth: month,
            kind,
            direction,
            amount: rupees,
            online,
            paidFrom,
            staffId: isStaffKind(kind) && staffId ? staffId : undefined,
            reason,
            clientId: saveId,
          })
        }
      >
        <Field label={`What was wrong in ${formatMonth(month)}?`} htmlFor="adjustment-kind" hint={choice.hint}>
          <NativeSelect
            id="adjustment-kind"
            className="w-full"
            value={kind}
            onChange={(event) => setKind(event.target.value as AdjustmentKind)}
          >
            {KIND_CHOICES.map((c) => (
              <NativeSelectOption key={c.value} value={c.value}>
                {c.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        {isStaffKind(kind) ? (
          <Field label="Staff member" htmlFor="adjustment-staff">
            <NativeSelect id="adjustment-staff" className="w-full" value={staffId} onChange={(event) => setStaffId(event.target.value)}>
              <NativeSelectOption value="">Choose...</NativeSelectOption>
              {staff.map((member) => (
                <NativeSelectOption key={member.id} value={member.id}>
                  {member.active ? member.name : `${member.name} (left)`}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        ) : null}

        <div className="space-y-1.5">
          <p className="text-sm font-medium">{directionQuestion(kind, staffName)}</p>
          <Segmented
            label={directionQuestion(kind, staffName)}
            value={direction}
            onChange={setDirection}
            options={[
              { value: "more", label: "More than recorded" },
              { value: "less", label: "Less than recorded" },
            ]}
          />
        </div>

        <Field label="By how much (Rs)" htmlFor="adjustment-amount">
          <Input
            id="adjustment-amount"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="h-10 tabular-nums"
          />
        </Field>

        {kind === "sale" ? (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Paid in</p>
            <Segmented
              label="Paid in"
              value={online ? "online" : "cash"}
              onChange={(value) => setOnline(value === "online")}
              options={[
                { value: "cash", label: "Cash" },
                { value: "online", label: "Online" },
              ]}
            />
          </div>
        ) : null}

        {kind === "expense" ? (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Paid from</p>
            <Segmented
              label="Paid from"
              value={paidFrom}
              onChange={setPaidFrom}
              options={[
                { value: "drawer", label: "The business" },
                { value: "owner", label: "Owner's pocket or bank" },
              ]}
            />
          </div>
        ) : null}

        <Field
          label="What happened"
          htmlFor="adjustment-reason"
          hint={isStaffKind(kind) ? "It goes in the khata line and in the audit log." : "It goes in the audit log."}
        >
          <Input
            id="adjustment-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-10"
            placeholder={PLACEHOLDER[kind]}
          />
        </Field>

        {effect ? (
          <div className="rounded-lg border bg-surface-sunken px-3 py-2.5 text-sm" aria-live="polite">
            <p>
              {formatMonth(countsIn)}&apos;s profit:{" "}
              <b className="tabular-nums">{effect.profit === 0 ? "no change" : signedRs(effect.profit)}</b>
            </p>
            {isStaffKind(kind) ? (
              <p>
                {staffName ?? "Their"} khata: <b className="tabular-nums">{signedRs(effect.khata)}</b>
                <span className="text-muted-foreground">
                  {effect.khata > 0 ? " (their balance goes up)" : " (their balance goes down)"}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}
      </FormDialog>
    </>
  );
}

/** "+Rs 1,000" or "-Rs 1,000": the sign always shows, since it is the point. */
const signedRs = (amount: number): string => (amount > 0 ? `+${rs(amount)}` : rs(amount));
