"use client";

import { Panel, PanelHeader } from "@/components/panel";
import { AlertCircle, ArrowRight, Banknote, ChartColumn, Clock, LockOpen, MessageCircle, ShieldCheck, TrendingUp, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatTime, rs } from "@/lib/format";
import { reopenDayAction, startNextDayAction } from "../actions";
import { buildSummaryText } from "../summary-text";
import type { SnapshotRow } from "../types";
import { Badge } from "@/components/ui/badge";

/** `canReopen` is true only for the Owner: reopening a closed day is theirs alone. */
export function ClosedView({ snapshot, canReopen }: { snapshot: SnapshotRow; canReopen: boolean }) {
  const router = useRouter();
  const [showSummary, setShowSummary] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [reopening, setReopening] = useState(false);
  const [reason, setReason] = useState("");
  const [reopenError, setReopenError] = useState("");
  // Its own transition, so starting the next day does not look like it is running.
  const [reopenPending, startReopen] = useTransition();
  const { difference } = snapshot;

  function nextDay() {
    setError("");
    startTransition(async () => {
      const result = await startNextDayAction();
      if (!result.ok) return setError(result.error);
      router.push("/billing");
      router.refresh();
    });
  }

  function confirmReopen() {
    setReopenError("");
    startReopen(async () => {
      const result = await reopenDayAction({ reason });
      if (!result.ok) return setReopenError(result.error);
      setReopening(false);
      router.refresh();
    });
  }

  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-center gap-4 px-card py-5">
          <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
            <ShieldCheck className="size-7" aria-hidden />
          </div>
          <div className="min-w-60 flex-1">
            <p className="text-base font-semibold">Day closed at {formatTime(snapshot.closedAt)}</p>
            <p className="text-muted-foreground">
              Security code sent with the daily summary. If any old entry is changed later, this code will no longer match.
            </p>
            <p className="mt-1.5 inline-block rounded-lg bg-secondary px-3 py-1.5 font-mono text-2xl font-medium tracking-[2px] text-primary">
              {snapshot.securityCode}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowSummary((value) => !value)}>
              <MessageCircle aria-hidden />
              {showSummary ? "Hide summary" : "Preview WhatsApp summary"}
            </Button>
            {canReopen ? (
              <Button
                variant="outline"
                onClick={() => {
                  setReason("");
                  setReopenError("");
                  setReopening(true);
                }}
              >
                <LockOpen aria-hidden />
                Reopen this day
              </Button>
            ) : null}
            <Button onClick={nextDay} disabled={pending}>
              {pending ? "Starting..." : "Start next business day"}
              {pending ? null : <ArrowRight aria-hidden />}
            </Button>
          </div>
        </div>

        {error ? (
          <p role="alert" className="flex items-center gap-1.5 border-t px-card py-3 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        {showSummary ? (
          <div className="border-t px-card py-4">
            <p className="mb-2 text-xs text-muted-foreground">Preview only: sending on WhatsApp is not connected yet.</p>
            <pre className="max-w-md rounded-xl border border-success-line bg-success-soft px-4 py-3.5 font-sans text-sm whitespace-pre-line">
              {buildSummaryText(snapshot)}
            </pre>
          </div>
        ) : null}
      </Panel>

      <Panel className="mt-4">
        <PanelHeader
          title="Today at a glance"
          action={<Badge variant="brass">Saved for the monthly report</Badge>}
        />
        <div className="grid gap-3 px-card py-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={TrendingUp} label="Sale" value={rs(snapshot.sale)} hint={`Cash ${rs(snapshot.cash)} + online ${rs(snapshot.online)}`} />
          <StatCard icon={Wallet} label="Expenses" value={rs(snapshot.expenses)} hint="Drawer and Owner-paid" />
          <StatCard icon={Users} label="Staff earnings" value={rs(snapshot.staffEarned)} hint={`Paid in hand today ${rs(snapshot.staffPaid)}`} />
          <StatCard icon={ChartColumn} label="Day profit" value={rs(snapshot.dayProfit)} hint="Sale - expenses - staff earnings" />
        </div>
        <p className="border-t px-card py-3 text-xs text-muted-foreground">
          Staff advances and cash the Owner took are not expenses, so they do not reduce the day profit.
        </p>
      </Panel>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Banknote} label="Expected" value={rs(snapshot.expectedCash)} />
        <StatCard icon={Wallet} label="Counted" value={rs(snapshot.countedCash)} />
        <StatCard
          icon={AlertCircle}
          label={difference < 0 ? "Short" : difference > 0 ? "Extra" : "Difference"}
          value={rs(Math.abs(difference))}
          hint={snapshot.diffReason ?? undefined}
        />
        <StatCard icon={Clock} label="Tomorrow's opening cash" value={rs(snapshot.countedCash)} />
      </div>

      <Dialog open={reopening} onOpenChange={(next) => !next && setReopening(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reopen this day?</DialogTitle>
            <DialogDescription>
              The day goes back to being open so it can be corrected and closed again. Today&apos;s closing record is kept
              with its security code, and the staff earnings and payments this close created are reversed, not deleted.
              A new security code is made at the next close.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason (required), e.g. closed before the last two bills were entered"
            aria-label="Reason for reopening"
            rows={3}
          />
          {reopenError ? (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {reopenError}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopening(false)}>
              Keep it closed
            </Button>
            <Button onClick={confirmReopen} disabled={reopenPending}>
              {reopenPending ? "Reopening..." : "Reopen day"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
