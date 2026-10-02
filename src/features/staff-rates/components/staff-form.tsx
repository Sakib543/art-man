"use client";

import { useState, type ReactNode } from "react";
import { Field } from "@/components/field";
import { FormDialog } from "@/components/form-dialog";
import { Input } from "@/components/ui/input";
import { PAY_PARTS, PAY_TYPE_LABEL, payTypeOf, type PayParts } from "@/lib/accounting";
import { saveStaffAction } from "../actions";
import type { StaffRow } from "../types";

interface StaffFormProps {
  /** The staff member being edited, or null to add a new one. */
  staff: StaffRow | null;
  open: boolean;
  onClose: () => void;
}

/** Mount this only while open so the fields start fresh each time. */
export function StaffForm({ staff, open, onClose }: StaffFormProps) {
  const [name, setName] = useState(staff?.name ?? "");
  // Pay is any mix of the three parts (P3.17); a new staff member starts on salary + commission.
  const [parts, setParts] = useState<PayParts>(() => ({ ...PAY_PARTS[staff?.payType ?? 2] }));
  const [salary, setSalary] = useState(staff?.salary ? String(staff.salary) : "");
  const [dailyWage, setDailyWage] = useState(staff?.dailyWage ? String(staff.dailyWage) : "");
  // 10% for someone new. An edit shows what is saved, 0 as blank: a pay with
  // commission at 0% is then refused, not quietly raised to 10%.
  const [commission, setCommission] = useState(staff ? (staff.commissionRate ? String(staff.commissionRate) : "") : "10");
  const [active, setActive] = useState(staff?.active ?? true);

  const editing = staff !== null;
  const payType = payTypeOf(parts);
  const tick = (part: keyof PayParts) => (value: boolean) => setParts((current) => ({ ...current, [part]: value }));

  return (
    <FormDialog
      open={open}
      title={editing ? `Edit ${staff.name}` : "Add staff"}
      description={editing ? "Changes apply from now on. Past records do not change." : undefined}
      onClose={onClose}
      onSubmit={async () => {
        if (payType === null) return { ok: false, error: "Tick at least one way this person is paid" };
        // A part not ticked is sent as 0, whatever its box still holds.
        return saveStaffAction({
          id: staff?.id,
          name,
          payType,
          salary: parts.salary ? Number(salary) || 0 : 0,
          dailyWage: parts.dailyWage ? Number(dailyWage) || 0 : 0,
          commissionRate: parts.commission ? Number(commission) || 0 : 0,
          active,
        });
      }}
    >
      <Field label="Name" htmlFor="staff-name">
        <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" autoFocus />
      </Field>

      <fieldset className="space-y-2.5">
        <legend className="mb-1.5 text-sm font-medium">How they are paid</legend>
        <PayPart
          label="Monthly salary"
          hint="Added to the khata when the month is closed"
          unit="Rs"
          checked={parts.salary}
          onCheck={tick("salary")}
        >
          <Input
            id="staff-salary"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            aria-label="Monthly salary in rupees"
            className="h-9 tabular-nums"
          />
        </PayPart>
        <PayPart
          label="Daily wage"
          hint="For each day present, added at Day close"
          unit="Rs"
          checked={parts.dailyWage}
          onCheck={tick("dailyWage")}
        >
          <Input
            id="staff-wage"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={dailyWage}
            onChange={(e) => setDailyWage(e.target.value)}
            aria-label="Daily wage in rupees"
            className="h-9 tabular-nums"
          />
        </PayPart>
        <PayPart
          label="Commission"
          hint="On the day's work they did, added at Day close"
          unit="%"
          checked={parts.commission}
          onCheck={tick("commission")}
        >
          <Input
            id="staff-commission"
            type="number"
            min={0}
            max={100}
            step="0.5"
            inputMode="decimal"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            aria-label="Commission percent"
            className="h-9 tabular-nums"
          />
        </PayPart>
        <p className="text-xs text-muted-foreground">
          {payType === null ? "Tick at least one." : `Pay type: ${PAY_TYPE_LABEL[payType]}`}
        </p>
      </fieldset>

      {editing ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4 accent-primary"
          />
          Active (can be chosen on new bills)
        </label>
      ) : null}
    </FormDialog>
  );
}

interface PayPartProps {
  label: string;
  hint: string;
  unit: string;
  checked: boolean;
  onCheck: (value: boolean) => void;
  /** The amount box, shown only while the part is ticked. */
  children: ReactNode;
}

/** One part of the pay: a tick, and its amount while it is ticked. */
function PayPart({ label, hint, unit, checked, onCheck, children }: PayPartProps) {
  return (
    <div className="flex min-h-11 items-center gap-3 rounded-md border px-3 py-2">
      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-muted-foreground">{hint}</span>
        </span>
      </label>
      {checked ? (
        <div className="flex w-32 shrink-0 items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{unit}</span>
          {children}
        </div>
      ) : null}
    </div>
  );
}
