"use client";

import { AlertCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Panel, PanelHeader } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatMonth, karachiDate } from "@/lib/business-date";
import { formatDate, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { cancelAdjustmentAction } from "../actions";
import { describeAdjustment } from "../rules";
import type { AdjustmentRow } from "../types";

interface AdjustmentsCardProps {
  title: string;
  description: string;
  rows: AdjustmentRow[];
  /**
   * The month named beside each row: on the month they count in, the month
   * each one corrects; on the corrected month, where each one counts.
   */
  show: "corrects" | "countsIn";
}

// Padding from `md` up only: below it the row is a card, and `.table-stacked`
// spaces it (HANDOFF 8.11).
const th = "px-3.5 py-2 text-left text-xs font-medium text-muted-foreground";
const td = "align-top md:px-3.5 md:py-2.5";

/** "+1,000", "-1,000" or "0": the sign always shows, since it is the point. */
const signed = (amount: number): string => (amount > 0 ? `+${num(amount)}` : amount < 0 ? `-${num(-amount)}` : "0");

/**
 * Adjustments for closed months (backlog P3.4), with a Cancel for each one
 * whose month is still open. A cancelled one stays listed, struck through,
 * beside the row that cancels it; the two come to nothing.
 */
export function AdjustmentsCard({ title, description, rows, show }: AdjustmentsCardProps) {
  // `target` is kept after closing so the dialog does not go blank while it animates out.
  const [target, setTarget] = useState<AdjustmentRow | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const profitTotal = rows.reduce((sum, row) => sum + row.profit, 0);

  function confirm() {
    if (!target) return;
    setError("");
    startTransition(async () => {
      const result = await cancelAdjustmentAction({ adjustmentId: target.id, reason });
      if (!result.ok) return setError(result.error);
      setOpen(false);
    });
  }

  return (
    <Panel className="mt-4">
      <PanelHeader title={title} description={description} />

      <div className="md:overflow-x-auto">
        <table className="table-stacked w-full text-sm">
          <thead>
            <tr className="border-b bg-surface-sunken">
              <th className={th}>Recorded</th>
              <th className={th}>{show === "corrects" ? "For" : "Counts in"}</th>
              <th className={th}>What was wrong</th>
              <th className={cn(th, "text-right")}>Profit</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const muted = row.cancelled || row.isCancellation;
              const said = row.isCancellation
                ? `Cancels: ${describeAdjustment({ ...row, amount: -row.amount })}`
                : describeAdjustment(row);
              return (
                <tr key={row.id} className={cn("border-b last:border-b-0", muted && "text-muted-foreground")}>
                  <td className={cn(td, "tabular-nums")} data-label="Recorded">
                    {formatDate(karachiDate(row.createdAt))}
                  </td>
                  <td className={td} data-label={show === "corrects" ? "For" : "Counts in"}>
                    {formatMonth(show === "corrects" ? row.corrects : row.countsIn)}
                  </td>
                  <td className={td} data-row-title="">
                    <p className={cn("font-medium", row.cancelled && "line-through")}>
                      {said}
                      {row.cancelled ? <Badge variant="destructive" className="ml-2">Cancelled</Badge> : null}
                      {row.isCancellation ? <Badge variant="secondary" className="ml-2">Cancellation</Badge> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.reason} · by {row.createdBy}
                    </p>
                    {row.khata !== 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {row.staffName ?? "Staff"} khata {signed(row.khata)}
                      </p>
                    ) : null}
                  </td>
                  <td
                    className={cn(
                      td,
                      "text-right font-semibold tabular-nums",
                      row.profit < 0 && !muted && "text-destructive",
                      row.cancelled && "font-normal line-through",
                    )}
                    data-label="Profit"
                  >
                    {signed(row.profit)}
                  </td>
                  <td className={cn(td, "text-right max-md:mt-1 max-md:border-t max-md:pt-2 max-md:empty:hidden")}>
                    {row.canCancel ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => {
                          setTarget(row);
                          setReason("");
                          setError("");
                          setOpen(true);
                        }}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {show === "corrects" ? (
        <p className="border-t px-card py-3 text-xs text-muted-foreground">
          Together they change this month&apos;s profit by <b className="tabular-nums">{signed(profitTotal)}</b>, the
          &ldquo;Adjustments for earlier months&rdquo; line above. An advance or a payment put right moves only the khata.
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel this adjustment?</DialogTitle>
            <DialogDescription>
              {target ? `${describeAdjustment(target)}. ` : ""}It stays in the record as cancelled, and a row of the
              opposite amount is added{target && target.khata !== 0 ? ", in the khata as well" : ""}. Nothing is deleted.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason (required), e.g. entered for the wrong person"
            aria-label="Reason for cancelling"
            rows={3}
          />
          {error ? (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={pending}>
              {pending ? "Cancelling..." : "Cancel adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
