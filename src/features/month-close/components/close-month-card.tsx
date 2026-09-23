"use client";

import { AlertCircle, CalendarCheck, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, num, rs } from "@/lib/format";
import { closeMonthAction } from "../actions";
import type { CloseState } from "../queries";
import { Panel } from "@/components/panel";

export function CloseMonthCard({ state, monthLabel }: { state: CloseState; monthLabel: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const blocked = state.blockers.length > 0;
  const salaryTotal = state.salaries.reduce((sum, line) => sum + line.salary, 0);

  function confirm() {
    setError("");
    startTransition(async () => {
      const result = await closeMonthAction({ month: state.month });
      if (!result.ok) return setError(result.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Panel className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-card py-4">
        <div className="min-w-60 flex-1">
          <h2 className="text-md font-semibold">Close {monthLabel}</h2>
          <p className="text-sm text-muted-foreground">
            Closing freezes the month, adds the monthly salaries to the staff khata and saves the partners&apos; shares. A
            correction found later goes in next month as an adjustment.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={blocked}>
          <CalendarCheck aria-hidden />
          Close {monthLabel}
        </Button>
      </div>

      {blocked ? (
        <ul className="space-y-1.5 border-t px-card py-3.5">
          {state.blockers.map((blocker) => (
            <li key={blocker} className="flex items-start gap-2 text-sm text-warning">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {blocker}
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Close {monthLabel}?</DialogTitle>
            <DialogDescription>This cannot be undone. After this, nothing in the month can be added or cancelled.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <p>
              Net profit saved: <b className="tabular-nums">{rs(state.netProfit)}</b> from {state.closedDays} closed day
              {state.closedDays === 1 ? "" : "s"}.
            </p>
            <div>
              <p className="mb-1 font-medium">Monthly salaries added to the staff khata {state.lastDay ? `(dated ${formatDate(state.lastDay)})` : ""}</p>
              <ul className="rounded-lg border">
                {state.salaries.map((line) => (
                  <li key={line.staffId} className="flex justify-between border-b px-3 py-2 last:border-b-0">
                    <span>{line.name}</span>
                    <span className="tabular-nums">{num(line.salary)}</span>
                  </li>
                ))}
                {state.salaries.length === 0 ? <li className="px-3 py-2 text-muted-foreground">No staff on a monthly salary</li> : null}
                <li className="flex justify-between bg-brass-tint px-3 py-2 font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{num(salaryTotal)}</span>
                </li>
              </ul>
            </div>
          </div>

          {error ? (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Not yet
            </Button>
            <Button onClick={confirm} disabled={pending}>
              {pending ? "Closing..." : `Close ${monthLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
