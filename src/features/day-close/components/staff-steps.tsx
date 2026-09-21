"use client";

import { Input } from "@/components/ui/input";
import { PAY_TYPE_LABEL, paysCommission, type DayEarning } from "@/lib/accounting";
import { num, rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CloseStaffRow } from "../types";
import { StepCard } from "./step-card";

const th = "px-3.5 py-2 text-left text-[12.5px] font-medium text-muted-foreground";
const td = "px-3.5 py-2.5";

const initials = (name: string) => name.slice(0, 2).toUpperCase();

export const payLabel = (row: CloseStaffRow) =>
  `${PAY_TYPE_LABEL[row.payType]}${paysCommission(row.payType) ? ` (${row.commissionRate}%)` : ""}`;

interface AttendanceStepProps {
  staff: CloseStaffRow[];
  present: Record<string, boolean>;
  onToggle: (id: string, value: boolean) => void;
  onNext: () => void;
}

/** Step 1: who was present. Only daily-wage staff are paid for it. */
export function AttendanceStep({ staff, present, onToggle, onNext }: AttendanceStepProps) {
  return (
    <StepCard
      title="Who worked today?"
      help="Daily wage is paid only to staff on the daily wage plan who were present."
      onNext={onNext}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#fafbfc]">
              <th className={th}>Staff</th>
              <th className={th}>Pay type</th>
              <th className={cn(th, "text-right")}>Work today</th>
              <th className={cn(th, "text-center")}>Present</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0">
                <td className={td}>
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-[#efe0c8] text-[13px] font-semibold text-brass-strong">
                      {initials(row.name)}
                    </span>
                    {row.name}
                  </div>
                </td>
                <td className={cn(td, "text-muted-foreground")}>{payLabel(row)}</td>
                <td className={cn(td, "text-right tabular-nums")}>{rs(row.work)}</td>
                <td className={cn(td, "text-center")}>
                  <input
                    type="checkbox"
                    checked={present[row.id] ?? true}
                    onChange={(event) => onToggle(row.id, event.target.checked)}
                    aria-label={`${row.name} present`}
                    className="size-[17px] accent-primary"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StepCard>
  );
}

interface EarningsStepProps {
  staff: CloseStaffRow[];
  earnings: Record<string, DayEarning>;
  onBack: () => void;
  onNext: () => void;
}

/** Step 2: what each person earned today, worked out from the bills. */
export function EarningsStep({ staff, earnings, onBack, onNext }: EarningsStepProps) {
  return (
    <StepCard
      title="Earnings calculated from today's bills"
      badge="Automatic"
      help="Cancelled bills and their reversals are already included, so nobody earns commission on a cancelled service."
      onBack={onBack}
      onNext={onNext}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#fafbfc]">
              <th className={th}>Staff</th>
              <th className={cn(th, "text-right")}>Work</th>
              <th className={cn(th, "text-right")}>Commission</th>
              <th className={cn(th, "text-right")}>Daily wage</th>
              <th className={cn(th, "text-right")}>Earned today</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((row) => {
              const e = earnings[row.id];
              return (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className={td}>
                    {row.name}
                    <p className="text-[12.5px] text-muted-foreground">{payLabel(row)}</p>
                  </td>
                  <td className={cn(td, "text-right tabular-nums")}>{num(e.work)}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{num(e.commission)}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{e.wage ? num(e.wage) : <span className="text-muted-foreground">-</span>}</td>
                  <td className={cn(td, "text-right font-semibold tabular-nums")}>{rs(e.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </StepCard>
  );
}

interface PaymentsStepProps {
  staff: CloseStaffRow[];
  earnings: Record<string, DayEarning>;
  payouts: Record<string, string>;
  pins: Record<string, string>;
  onPayout: (id: string, value: string) => void;
  onPin: (id: string, value: string) => void;
  error: string;
  pending: boolean;
  onBack: () => void;
  onNext: () => void;
}

/** Step 3: cash handed to staff now. Each person confirms with their own PIN. */
export function PaymentsStep({ staff, earnings, payouts, pins, onPayout, onPin, error, pending, onBack, onNext }: PaymentsStepProps) {
  return (
    <StepCard
      title="Payments to staff today"
      help="Anything not taken today stays in the staff member's khata and is paid with salary."
      error={error}
      pending={pending}
      onBack={onBack}
      onNext={onNext}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#fafbfc]">
              <th className={th}>Staff</th>
              <th className={cn(th, "text-right")}>Khata balance</th>
              <th className={cn(th, "text-right")}>Earned today</th>
              <th className={cn(th, "w-36")}>Paid today</th>
              <th className={cn(th, "w-32")}>Staff PIN</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0">
                <td className={td}>{row.name}</td>
                <td className={cn(td, "text-right tabular-nums")}>{num(row.khataBalance)}</td>
                <td className={cn(td, "text-right tabular-nums")}>{num(earnings[row.id].total)}</td>
                <td className={td}>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={payouts[row.id] ?? "0"}
                    onChange={(event) => onPayout(row.id, event.target.value)}
                    aria-label={`Paid to ${row.name}`}
                    className="h-9 tabular-nums"
                  />
                </td>
                <td className={td}>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="off"
                    value={pins[row.id] ?? ""}
                    onChange={(event) => onPin(row.id, event.target.value.replace(/\D/g, ""))}
                    placeholder="PIN"
                    aria-label={`${row.name} PIN`}
                    className="h-9 tracking-widest"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </StepCard>
  );
}
