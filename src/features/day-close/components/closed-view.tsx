"use client";

import { AlertCircle, ArrowRight, Banknote, ChartColumn, Clock, MessageCircle, ShieldCheck, TrendingUp, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { formatTime, rs } from "@/lib/format";
import { startNextDayAction } from "../actions";
import { buildSummaryText } from "../summary-text";
import type { SnapshotRow } from "../types";

export function ClosedView({ snapshot }: { snapshot: SnapshotRow }) {
  const router = useRouter();
  const [showSummary, setShowSummary] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
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

  return (
    <>
      <div className="rounded-[14px] border bg-card">
        <div className="flex flex-wrap items-center gap-[18px] px-[22px] py-5">
          <div className="grid size-14 shrink-0 place-items-center rounded-[14px] bg-success-soft text-success">
            <ShieldCheck className="size-7" aria-hidden />
          </div>
          <div className="min-w-60 flex-1">
            <p className="text-base font-semibold">Day closed at {formatTime(snapshot.closedAt)}</p>
            <p className="text-muted-foreground">
              Security code sent with the daily summary. If any old entry is changed later, this code will no longer match.
            </p>
            <p className="mt-1.5 inline-block rounded-lg bg-secondary px-3 py-1.5 font-mono text-[22px] font-medium tracking-[2px] text-primary">
              {snapshot.securityCode}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-10" onClick={() => setShowSummary((value) => !value)}>
              <MessageCircle aria-hidden />
              {showSummary ? "Hide summary" : "Preview WhatsApp summary"}
            </Button>
            <Button className="h-10" onClick={nextDay} disabled={pending}>
              {pending ? "Starting..." : "Start next business day"}
              {pending ? null : <ArrowRight aria-hidden />}
            </Button>
          </div>
        </div>

        {error ? (
          <p role="alert" className="flex items-center gap-1.5 border-t px-[22px] py-3 text-[12.5px] text-destructive">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        {showSummary ? (
          <div className="border-t px-[18px] py-4">
            <p className="mb-2 text-[12.5px] text-muted-foreground">Preview only: sending on WhatsApp is not connected yet.</p>
            <pre className="max-w-md rounded-xl border border-[#d3e8da] bg-[#f1f8f3] px-4 py-3.5 font-sans text-[13.5px] whitespace-pre-line">
              {buildSummaryText(snapshot)}
            </pre>
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-[14px] border bg-card">
        <div className="flex items-center justify-between border-b px-[18px] py-3.5">
          <h2 className="text-[15px] font-semibold">Today at a glance</h2>
          <span className="rounded-full bg-brass-soft px-2 py-0.5 text-xs font-medium text-brass-strong">Saved for the monthly report</span>
        </div>
        <div className="grid gap-3 px-[18px] py-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={TrendingUp} label="Sale" value={rs(snapshot.sale)} hint={`Cash ${rs(snapshot.cash)} + online ${rs(snapshot.online)}`} />
          <StatCard icon={Wallet} label="Expenses" value={rs(snapshot.expenses)} hint="Drawer and Owner-paid" />
          <StatCard icon={Users} label="Staff earnings" value={rs(snapshot.staffEarned)} hint={`Paid in hand today ${rs(snapshot.staffPaid)}`} />
          <StatCard icon={ChartColumn} label="Day profit" value={rs(snapshot.dayProfit)} hint="Sale - expenses - staff earnings" />
        </div>
        <p className="border-t px-[18px] py-3 text-[12.5px] text-muted-foreground">
          Staff advances and cash the Owner took are not expenses, so they do not reduce the day profit.
        </p>
      </div>

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
    </>
  );
}
