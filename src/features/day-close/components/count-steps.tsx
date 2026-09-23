"use client";

import { Panel, PanelHeader, panelClass } from "@/components/panel";
import { AlertCircle, ArrowLeft, Check, Lock } from "lucide-react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { num, rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CloseReview } from "../types";

interface CountStepProps {
  counted: string;
  onCounted: (value: string) => void;
  error: string;
  pending: boolean;
  onBack: () => void;
  onNext: () => void;
}

/** Step 4: count first. Expected cash stays hidden so the count is honest. */
export function CountStep({ counted, onCounted, error, pending, onBack, onNext }: CountStepProps) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onNext();
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <form onSubmit={submit} className={cn(panelClass)}>
        <PanelHeader title="Cash in drawer" />
        <div className="px-card py-4">
          <Label htmlFor="cash-counted" className="mb-1.5">
            Total cash counted (Rs)
          </Label>
          <Input
            id="cash-counted"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={counted}
            onChange={(event) => onCounted(event.target.value)}
            placeholder="0"
            autoFocus
            className="h-14 px-3.5 text-3xl font-semibold tracking-tight tabular-nums"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Count all the cash in the drawer and enter only the total, then press Enter.
          </p>
        </div>
      </form>

      <Panel>
        <PanelHeader title="Expected cash" />
        <div className="px-card py-4">
          <div className="rounded-lg border border-dashed bg-surface-sunken px-4 py-6 text-center text-muted-foreground">
            <Lock className="mx-auto mb-1.5 size-6 text-muted-foreground/70" aria-hidden />
            <p className="font-medium text-foreground-soft">Hidden until the count is complete</p>
            <p className="mt-1 text-xs">The Manager counts first, so the count is honest and not adjusted to match.</p>
          </div>
          {error ? (
            <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-between border-t px-card py-3.5">
          <Button variant="outline" onClick={onBack} disabled={pending}>
            <ArrowLeft aria-hidden />
            Back
          </Button>
          <Button onClick={onNext} disabled={pending}>
            {pending ? "Please wait..." : "Count complete"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}

interface ReviewStepProps {
  review: CloseReview;
  reason: string;
  onReason: (value: string) => void;
  error: string;
  pending: boolean;
  onRecount: () => void;
  onClose: () => void;
}

/** Step 5: expected against counted, then lock the day. */
export function ReviewStep({ review, reason, onReason, error, pending, onRecount, onClose }: ReviewStepProps) {
  const { expected, counted, difference, breakdown, onlineSales } = review;
  const short = difference < 0;
  const extra = difference > 0;

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Result label="Expected" value={rs(expected)} />
        <Result label="Counted" value={rs(counted)} />
        <Result
          label={short ? "Short" : extra ? "Extra" : "Difference"}
          value={rs(Math.abs(difference))}
          tone={short ? "short" : extra ? "extra" : "match"}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="How expected cash is calculated" />
          <table className="w-full text-sm">
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.label} className="border-b">
                  <td className="px-card py-2.5">{row.label}</td>
                  <td className="px-card py-2.5 text-right tabular-nums">
                    {row.amount < 0 ? `-${num(-row.amount)}` : row.amount > 0 ? `+${num(row.amount)}` : "0"}
                  </td>
                </tr>
              ))}
              <tr className="bg-brass-tint font-semibold">
                <td className="px-card py-2.5">Expected cash in drawer</td>
                <td className="px-card py-2.5 text-right tabular-nums">{rs(expected)}</td>
              </tr>
            </tbody>
          </table>
          <p className="border-t px-card py-3 text-xs text-muted-foreground">
            Online payments ({rs(onlineSales)}) are not included because they never enter the drawer.
          </p>
        </Panel>

        <Panel>
          <PanelHeader title="Close the day" />
          <div className="space-y-3 px-card py-4">
            {difference !== 0 ? (
              <div>
                <Label htmlFor="difference-reason" className="mb-1.5">
                  {short ? "Reason for shortage (required)" : "Reason for extra cash"}
                </Label>
                <Textarea
                  id="difference-reason"
                  rows={3}
                  value={reason}
                  onChange={(event) => onReason(event.target.value)}
                  placeholder={short ? "Wrong change given to a customer" : "Customer left the change"}
                />
              </div>
            ) : (
              <p className="flex items-center gap-2 rounded-lg border border-info-line bg-info-soft px-3 py-2.5 text-sm text-info">
                <Check className="size-4 shrink-0" aria-hidden />
                The drawer matches exactly.
              </p>
            )}
            {error ? (
              <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0" aria-hidden />
                {error}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              After closing, no entries can be added to today. Tomorrow&apos;s opening cash will be {rs(counted)}.
            </p>
          </div>
          <div className="flex items-center justify-between border-t px-card py-3.5">
            <Button variant="outline" onClick={onRecount} disabled={pending}>
              <ArrowLeft aria-hidden />
              Recount
            </Button>
            <Button onClick={onClose} disabled={pending}>
              <Lock aria-hidden />
              {pending ? "Closing..." : "Close day"}
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Result({ label, value, tone = "plain" }: { label: string; value: string; tone?: "plain" | "short" | "extra" | "match" }) {
  return (
    <div
      className={cn(
        panelClass, "px-card py-4",
        tone === "short" && "border-danger-line bg-danger-soft",
        tone === "extra" && "border-success-line bg-success-soft",
      )}
    >
      <p className={cn("text-sm text-muted-foreground", tone === "short" && "text-destructive", tone === "extra" && "text-success")}>{label}</p>
      <p className={cn("text-3xl font-semibold tracking-tight tabular-nums", tone === "short" && "text-destructive", tone === "extra" && "text-success")}>
        {value}
      </p>
    </div>
  );
}
