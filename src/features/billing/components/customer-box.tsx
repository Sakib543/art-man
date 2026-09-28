"use client";

import { AlertCircle, Search } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, rs } from "@/lib/format";
import { customerByPhone } from "@/lib/offline/catalog";
import { readCatalog } from "@/lib/offline/store";
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
  /** No internet (P2.2d): look the number up in this computer's copy, not on the server. */
  offline?: boolean;
}

/**
 * A customer from the offline copy (P2.2d), which holds every customer's name
 * and special rates but not their visits.
 */
async function findOffline(phone: string): Promise<CustomerState> {
  const copy = await readCatalog().catch(() => null);
  const known = copy ? customerByPhone(copy.catalog, phone) : null;
  if (!known) return { status: "new", phone, name: "" };
  return {
    status: "found",
    info: {
      id: known.id,
      phone: known.phone,
      name: known.name,
      visits: 0,
      lastVisit: null,
      specialRates: known.specialRates,
      offline: true,
    },
  };
}

export function CustomerBox({ value, onChange, offline = false }: CustomerBoxProps) {
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
      if (!offline) {
        try {
          const result = await lookupCustomerAction({ phone: trimmed });
          if (!result.ok) return setError(result.error);
          return onChange(
            result.data ? { status: "found", info: result.data } : { status: "new", phone: trimmed, name: "" },
          );
        } catch {
          // The server could not be reached. Uncaught, this took the whole
          // screen down with the cart in it; the copy answers instead.
        }
      }
      onChange(await findOffline(trimmed));
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
      <div className="rounded-lg border border-brass-line bg-brass-soft px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{info.name}</p>
            <p className="text-xs text-brass-strong">
              {info.offline ? "Found on this computer — no internet" : visitLabel(info.visits)}
            </p>
          </div>
          {hasSpecial ? <Badge variant="brass">Special rate</Badge> : null}
          <Button variant="ghost" size="sm" onClick={clear}>
            Change
          </Button>
        </div>
        {/*
          What the customer had done last time (P3.8). It sits under the name
          rather than in a dialog because the counter reads it while the
          customer is still standing there, mid-conversation.
        */}
        {info.offline ? (
          <p className="mt-2.5 border-t border-brass-line pt-2.5 text-xs text-muted-foreground">
            The last visit shows when the internet is back.
          </p>
        ) : info.lastVisit ? (
          <div className="mt-2.5 border-t border-brass-line pt-2.5">
            <p className="flex items-baseline justify-between gap-2 text-xs text-brass-strong">
              <span>
                Last visit · {formatDate(info.lastVisit.businessDate)} · Bill #{info.lastVisit.billNo}
              </span>
              <span className="shrink-0 font-medium tabular-nums">{rs(info.lastVisit.total)}</span>
            </p>
            <ul className="mt-1 space-y-0.5">
              {info.lastVisit.lines.map((line, index) => (
                <li key={index} className="flex items-baseline justify-between gap-2 text-xs">
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
          <p className="mt-2.5 border-t border-brass-line pt-2.5 text-xs text-muted-foreground">
            No earlier visit to show.
          </p>
        )}
      </div>
    );
  }

  if (value.status === "new") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
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
        <Button variant="outline" onClick={find} disabled={pending}>
          {pending ? "..." : "Find"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="size-4" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
