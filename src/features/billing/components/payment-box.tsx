"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkPayment, type PayMode } from "@/lib/accounting";
import { rs } from "@/lib/format";
import { cn } from "@/lib/utils";

const MODES: { value: PayMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "online", label: "Online (QR)" },
  { value: "split", label: "Split" },
];

interface PaymentBoxProps {
  total: number;
  mode: PayMode;
  onModeChange: (mode: PayMode) => void;
  cash: string;
  online: string;
  onCashChange: (value: string) => void;
  onOnlineChange: (value: string) => void;
}

export function PaymentBox({ total, mode, onModeChange, cash, online, onCashChange, onOnlineChange }: PaymentBoxProps) {
  const check = checkPayment(total, Number(cash) || 0, Number(online) || 0);

  return (
    <div className="mt-3.5">
      <Label className="mb-1.5">Payment</Label>
      <div className="grid grid-flow-col auto-cols-fr gap-0.5 rounded-[9px] bg-secondary p-[3px]" role="radiogroup">
        {MODES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => onModeChange(value)}
            className={cn(
              "min-h-9 rounded-[7px] px-2 text-[13.5px]",
              mode === value ? "bg-white font-medium shadow-sm" : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "split" ? (
        <>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <div>
              <Label htmlFor="pay-cash" className="mb-1.5">
                Cash
              </Label>
              <Input
                id="pay-cash"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={cash}
                onChange={(event) => onCashChange(event.target.value)}
                className="h-10 tabular-nums"
              />
            </div>
            <div>
              <Label htmlFor="pay-online" className="mb-1.5">
                Online
              </Label>
              <Input
                id="pay-online"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={online}
                onChange={(event) => onOnlineChange(event.target.value)}
                className="h-10 tabular-nums"
              />
            </div>
          </div>
          {total > 0 ? (
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">
              {check.remaining === 0
                ? "Payment matches total"
                : check.remaining > 0
                  ? `Remaining ${rs(check.remaining)}`
                  : `Over by ${rs(-check.remaining)}`}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
