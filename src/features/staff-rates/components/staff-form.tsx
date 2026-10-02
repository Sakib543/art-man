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
import { previewLeaverAction, saveStaffAction } from "../actions";
import { settlementText } from "../leaver";
import type { StaffRow } from "../types";

interface StaffFormProps {
  /** The staff member being edited, or null to add a new one. */
  staff: StaffRow | null;
  /** The latest business day that is closed: a leaver's last working day can be no later (P3.19). */
  latestClosedDay: string | null;
  open: boolean;
  onClose: () => void;
}

/** Mount this only while open so the fields start fresh each time. */
export function StaffForm({ staff, latestClosedDay, open, onClose }: StaffFormProps) {
  const [name, setName] = useState(staff?.name ?? "");
  const [payType, setPayType] = useState<PayType>(staff?.payType ?? 2);
  const [salary, setSalary] = useState(String(staff?.salary ?? ""));
  const [dailyWage, setDailyWage] = useState(String(staff?.dailyWage ?? ""));
  const [commission, setCommission] = useState(String(staff?.commissionRate ?? "10"));
  const [overtimeRate, setOvertimeRate] = useState(staff?.overtimeRate ? String(staff.overtimeRate) : "");
  const [active, setActive] = useState(staff?.active ?? true);
  // Making a karigar on a salary inactive (P3.19): their last working day, and what it settles.
  const [lastDay, setLastDay] = useState(latestClosedDay ?? "");
  const [settles, setSettles] = useState("");

  const editing = staff !== null;
  const leaving = editing && staff.active && !active && paysSalary(staff.payType);

  /** Ask the server what the Save would post, from the attendance it holds. */
  function preview(day: string) {
    setSettles("");
    if (!staff || !day) return;
    previewLeaverAction({ staffId: staff.id, lastDay: day })
      .then((result) => setSettles(result.ok ? settlementText(result.data.settlement, result.data.salary) : result.error))
      .catch(() => setSettles("Could not work it out. Check the internet and choose the date again."));
  }

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
          overtimeRate: Number(overtimeRate) || 0,
          active,
          lastDay: leaving ? lastDay : undefined,
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
        <Field label="Overtime (Rs per hour)" htmlFor="staff-overtime">
          <Input
            id="staff-overtime"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={overtimeRate}
            onChange={(e) => setOvertimeRate(e.target.value)}
            placeholder="None"
            className="h-10 tabular-nums"
          />
        </Field>
      </div>

      {editing ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => {
              setActive(e.target.checked);
              if (!e.target.checked && staff.active && paysSalary(staff.payType)) preview(lastDay);
            }}
            className="size-4 accent-primary"
          />
          Active (can be chosen on new bills)
        </label>
      ) : null}

      {leaving ? (
        <Field
          label="Last working day"
          htmlFor="staff-last-day"
          hint={settles || "Their salary for this month is paid for the days they were present, up to this day."}
        >
          <Input
            id="staff-last-day"
            type="date"
            max={latestClosedDay ?? undefined}
            value={lastDay}
            onChange={(e) => {
              setLastDay(e.target.value);
              preview(e.target.value);
            }}
            className="h-10"
          />
        </Field>
      ) : null}
    </FormDialog>
  );
}
