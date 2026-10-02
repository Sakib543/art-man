"use client";

import { useState } from "react";
import { Field } from "@/components/field";
import { FormDialog } from "@/components/form-dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  PAY_TYPES,
  PAY_TYPE_LABEL,
  paysCommission,
  paysDailyWage,
  paysSalary,
  type PayType,
} from "@/lib/accounting";
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
  const [payType, setPayType] = useState<PayType>(staff?.payType ?? 2);
  const [salary, setSalary] = useState(String(staff?.salary ?? ""));
  const [dailyWage, setDailyWage] = useState(String(staff?.dailyWage ?? ""));
  const [commission, setCommission] = useState(String(staff?.commissionRate ?? "10"));
  const [active, setActive] = useState(staff?.active ?? true);

  const editing = staff !== null;

  return (
    <FormDialog
      open={open}
      title={editing ? `Edit ${staff.name}` : "Add staff"}
      description={editing ? "Changes apply from now on. Past records do not change." : undefined}
      onClose={onClose}
      onSubmit={() =>
        saveStaffAction({
          id: staff?.id,
          name,
          payType,
          salary: Number(salary) || 0,
          dailyWage: Number(dailyWage) || 0,
          commissionRate: Number(commission) || 0,
          active,
        })
      }
    >
      <Field label="Name" htmlFor="staff-name">
        <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" autoFocus />
      </Field>

      <Field label="Pay type" htmlFor="staff-pay-type">
        <NativeSelect
          id="staff-pay-type"
          className="w-full"
          value={payType}
          onChange={(e) => setPayType(Number(e.target.value) as PayType)}
        >
          {PAY_TYPES.map((type) => (
            <NativeSelectOption key={type} value={type}>
              {PAY_TYPE_LABEL[type]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        {paysSalary(payType) ? (
          <Field label="Monthly salary (Rs)" htmlFor="staff-salary">
            <Input
              id="staff-salary"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className="h-10 tabular-nums"
            />
          </Field>
        ) : null}
        {paysDailyWage(payType) ? (
          <Field label="Daily wage (Rs)" htmlFor="staff-wage">
            <Input
              id="staff-wage"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={dailyWage}
              onChange={(e) => setDailyWage(e.target.value)}
              className="h-10 tabular-nums"
            />
          </Field>
        ) : null}
        {paysCommission(payType) ? (
          <Field label="Commission (%)" htmlFor="staff-commission">
            <Input
              id="staff-commission"
              type="number"
              min={0}
              max={100}
              step="0.5"
              inputMode="decimal"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="h-10 tabular-nums"
            />
          </Field>
        ) : null}
      </div>

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
