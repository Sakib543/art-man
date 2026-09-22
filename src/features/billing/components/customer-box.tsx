"use client";

import { AlertCircle, Search } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, rs } from "@/lib/format";
import { lookupCustomerAction } from "../actions";
import { visitLabel } from "../last-visit";
import type { CustomerInfo } from "../types";

/** The customer on this bill: nobody (walk-in), a saved customer, or a new one. */
export type CustomerState =
  | { status: "none" }
  | { status: "found"; info: CustomerInfo }
  | { status: "new"; phone: string; name: string };

interface CustomerBoxProps {
  value: CustomerState;
  onChange: (next: CustomerState) => void;
}

export function CustomerBox({ value, onChange }: CustomerBoxProps) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function find() {
    const trimmed = phone.trim();
    if (trimmed.length < 7) {
      setError("Enter the customer's mobile number");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await lookupCustomerAction({ phone: trimmed });
      if (!result.ok) return setError(result.error);
      onChange(result.data ? { status: "found", info: result.data } : { status: "new", phone: trimmed, name: "" });
    });
  }

  function clear() {
    setPhone("");
    setError("");
    onChange({ status: "none" });
  }

  if (value.status === "found") {
    const { info } = value;
    const hasSpecial = Object.keys(info.specialRates).length > 0;
    return (
      <div className="rounded-[10px] border border-[#efe0c8] bg-brass-soft px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{info.name}</p>
            <p className="text-[12.5px] text-brass-strong">{visitLabel(info.visits)}</p>
          </div>
          {hasSpecial ? <Badge className="bg-white text-brass-strong">Special rate</Badge> : null}
          <Button variant="ghost" size="sm" onClick={clear}>
            Change
          </Button>
        </div>
        {/*
          What the customer had done last time (P3.8). It sits under the name
          rather than in a dialog because the counter reads it while the
          customer is still standing there, mid-conversation.
        */}
        {info.lastVisit ? (
          <div className="mt-2.5 border-t border-[#efe0c8] pt-2.5">
            <p className="flex items-baseline justify-between gap-2 text-[12.5px] text-brass-strong">
              <span>
                Last visit · {formatDate(info.lastVisit.businessDate)} · Bill #{info.lastVisit.billNo}
              </span>
              <span className="shrink-0 font-medium tabular-nums">{rs(info.lastVisit.total)}</span>
            </p>
            <ul className="mt-1 space-y-0.5">
              {info.lastVisit.lines.map((line, index) => (
                <li key={index} className="flex items-baseline justify-between gap-2 text-[12.5px]">
                  <span className="min-w-0 truncate">
                    {line.name}
                    <span className="text-muted-foreground"> · {line.staffName}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{rs(line.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-2.5 border-t border-[#efe0c8] pt-2.5 text-[12.5px] text-muted-foreground">
            No earlier visit to show.
          </p>
        )}
      </div>
    );
  }

  if (value.status === "new") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
          <span>New customer: {value.phone}</span>
          <Button variant="ghost" size="sm" onClick={clear}>
            Cancel
          </Button>
        </div>
        <Input
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          placeholder="Customer name (saved with this bill)"
          aria-label="Customer name"
          className="h-10"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                find();
              }
            }}
            placeholder="Customer mobile (optional)"
            aria-label="Customer mobile number"
            className="h-10 pl-8.5"
          />
        </div>
        <Button variant="outline" className="h-10" onClick={find} disabled={pending}>
          {pending ? "..." : "Find"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-[12.5px] text-destructive">
          <AlertCircle className="size-4" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
