"use client";

import { Panel, PanelHeader, panelClass } from "@/components/panel";
import { AlertCircle, ArrowLeft, Check, Lock, WifiOff } from "lucide-react";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatTime, num, rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { cashCountOf, NOTES, type NoteCounts } from "../cash-count";
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
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={counted}
            onChange={(event) => onCounted(event.target.value)}
            placeholder="0"
            autoFocus
            className="h-14 px-3.5 text-3xl font-semibold tracking-tight tabular-nums"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Count all the cash in the drawer and enter only the total, then press Enter.
          </p>
          <NoteByNote onTotal={(total) => onCounted(String(total))} />
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

/**
 * The drawer counted note by note (P7.18, QA-15; spec §5.4(4)): how many of
 * each note, and the coins, added up into the total above as they are typed.
 * Folded away until wanted — the total box is still the quick way, and what is
 * saved. Enter here does not finish the count: the next box is a note away.
 */
function NoteByNote({ onTotal }: { onTotal: (total: number) => void }) {
  const [notes, setNotes] = useState<NoteCounts>({});
  const [coins, setCoins] = useState("");
  const count = cashCountOf(notes, coins);

  function change(nextNotes: NoteCounts, nextCoins: string) {
    setNotes(nextNotes);
    setCoins(nextCoins);
    const next = cashCountOf(nextNotes, nextCoins);
    if (next.ok) onTotal(next.total);
  }

  const stayHere = (event: KeyboardEvent) => {
    if (event.key === "Enter") event.preventDefault();
  };

  return (
    <details className="mt-3 rounded-lg border bg-surface-sunken">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Count note by note</summary>
      <div className="space-y-1.5 border-t px-3 py-3">
        {NOTES.map((note) => {
          const id = `note-${note}`;
          const many = Number(notes[note] || 0);
          return (
            <div key={note} className="flex items-center gap-2.5 text-sm">
              <Label htmlFor={id} className="w-20 shrink-0 justify-end tabular-nums">
                Rs {num(note)} ×
              </Label>
              <Input
                id={id}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={notes[note] ?? ""}
                onChange={(event) => change({ ...notes, [note]: event.target.value }, coins)}
                onKeyDown={stayHere}
                placeholder="0"
                className="h-9 w-20 tabular-nums"
              />
              <span className="ml-auto text-muted-foreground tabular-nums">
                {Number.isSafeInteger(many) && many > 0 ? rs(note * many) : ""}
              </span>
            </div>
          );
        })}
        <div className="flex items-center gap-2.5 text-sm">
          <Label htmlFor="note-coins" className="w-20 shrink-0 justify-end">
            Coins (Rs)
          </Label>
          <Input
            id="note-coins"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={coins}
            onChange={(event) => change(notes, event.target.value)}
            onKeyDown={stayHere}
            placeholder="0"
            className="h-9 w-20 tabular-nums"
          />
        </div>
        {count.ok ? (
          <p className="pt-1 text-xs text-muted-foreground">
            Adds up to <span className="font-semibold text-foreground tabular-nums">{rs(count.total)}</span>, put in the total above.
          </p>
        ) : (
          <p role="alert" className="flex items-center gap-1.5 pt-1 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {count.problem}
          </p>
        )}
      </div>
    </details>
  );
}

interface ReviewStepProps {
  review: CloseReview;
  /**
   * When expected cash was worked out on this computer, with no server
   * (P2.2f): the "as of" of its copy of the day. Null when the server did.
   */
  here: string | null;
  reason: string;
  onReason: (value: string) => void;
  error: string;
  pending: boolean;
  onRecount: () => void;
  onClose: () => void;
}

/** Step 5: expected against counted, then lock the day. */
export function ReviewStep({ review, here, reason, onReason, error, pending, onRecount, onClose }: ReviewStepProps) {
  const { expected, counted, difference, breakdown, onlineSales } = review;
  // Below zero, no count can match: it is an error to put right, never "Extra" (P7.5).
  const impossible = expected < 0;
  const short = difference < 0;
  const extra = difference > 0 && !impossible;

  return (
    <>
      {here !== null ? (
        <p
          role="note"
          className="mb-4 flex items-start gap-2 rounded-lg border border-warning-line bg-warning-soft px-3.5 py-2.5 text-sm text-warning"
        >
          <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            No internet: expected cash was worked out on this computer, from the day as it had it at {formatTime(here)}{" "}
            and what was made here since. The close is kept here and sent when the internet is back; the server then
            makes the security code, and closes the day only if its own books come to the same expected cash.
          </span>
        </p>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Result label="Expected" value={rs(expected)} />
        <Result label="Counted" value={rs(counted)} />
        <Result
          label={impossible ? "Difference" : short ? "Short" : extra ? "Extra" : "Difference"}
          value={impossible ? "-" : rs(Math.abs(difference))}
          tone={impossible ? "short" : short ? "short" : extra ? "extra" : "match"}
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
            {impossible ? (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger-line bg-danger-soft px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  Expected cash comes to {rs(expected)}: more is recorded as leaving the drawer than it held, so the day
                  cannot be closed like this. Go back and check the payments to staff, and today&apos;s Daily folders.
                </span>
              </p>
            ) : difference !== 0 ? (
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
              {here !== null
                ? "After closing, nothing more can be added to this day on this computer; only the Owner can reopen it, once the close has reached the server."
                : "After closing, no entries can be added to today."}{" "}
              Tomorrow&apos;s opening cash will be {rs(counted)}.
            </p>
          </div>
          <div className="flex items-center justify-between border-t px-card py-3.5">
            <Button variant="outline" onClick={onRecount} disabled={pending}>
              <ArrowLeft aria-hidden />
              Recount
            </Button>
            <Button onClick={onClose} disabled={pending || impossible}>
              <Lock aria-hidden />
              {pending ? "Closing..." : here !== null ? "Close day offline" : "Close day"}
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
