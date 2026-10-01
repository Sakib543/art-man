"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { unstable_isUnrecognizedActionError, useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { DiscountNote } from "@/components/discount-note";
import { Panel, PanelHeader } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useOutbox } from "@/components/use-outbox";
import { formatDate, formatDateTime, paidBy, rs } from "@/lib/format";
import { isBillItem, type OutboxEntry } from "@/lib/offline/outbox";
import { slipLabel } from "@/lib/offline/slip";
import { removeFromOutbox, setRejected } from "@/lib/offline/store";
import { discardOfflineBillAction } from "../actions";

const OUTDATED = "The app was updated while this screen was open. Reload the page (F5) and try again.";

/**
 * Bills made offline that the server refused (backlog P2.2c), above the
 * billing screen. Each waits here — a machine never drops one — until a
 * person does one of three things:
 *
 * - **Open in billing**: put it right on the screen below and save it. It is
 *   saved under its own id, so it can only ever be saved once.
 * - **Send again**: once whatever was wrong has been put right elsewhere — a
 *   day reopened, a staff member switched back on.
 * - **Remove**: with a reason, which goes to the audit log with the bill.
 *
 * `fixing` is the bill already open on the screen below.
 */
export function NeedsAttention({ fixing }: { fixing: string | null }) {
  const router = useRouter();
  // A refused folder entry waits on Daily folders instead (P2.2e).
  const refused = useOutbox().filter(isBillItem).filter((entry) => entry.rejected !== null);

  // Kept after closing, so the dialog does not go blank while it animates out.
  const [target, setTarget] = useState<OutboxEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  // Set the moment Remove is pressed, before the button can show it is busy,
  // so a second press is never sent (the server writes one removal anyway).
  const removing = useRef(false);

  if (refused.length === 0 && !notice) return null;

  function sendAgain(entry: OutboxEntry) {
    setNotice("");
    setRejected(entry.clientId, null)
      .then(() =>
        setNotice("Sent again. If the server still refuses it, it comes back to this list with the reason."),
      )
      .catch(() => setNotice("This browser could not change its list. Reload the page and try again."));
  }

  function openRemove(entry: OutboxEntry) {
    setTarget(entry);
    setReason("");
    setError("");
    setOpen(true);
  }

  function confirmRemove() {
    if (!target || removing.current) return;
    removing.current = true;
    setError("");
    startTransition(async () => {
      try {
        let result;
        try {
          result = await discardOfflineBillAction({ clientId: target.clientId, reason, entry: target });
        } catch (thrown) {
          // Caught here, or the screen would fall over with the dialog open.
          return setError(
            unstable_isUnrecognizedActionError(thrown)
              ? OUTDATED
              : "The server could not be reached. Removing a bill needs the internet — try again when it is back.",
          );
        }
        if (!result.ok) return setError(result.error);

        try {
          await removeFromOutbox(target.clientId);
        } catch {
          return setError("Recorded, but this browser could not take it off its list. Reload the page.");
        }
        setNotice(
          result.data
            ? `It had reached the server after all: it is bill #${result.data.billNo}. It is off this list.`
            : "Removed. The bill and the reason are in the audit log.",
        );
        setOpen(false);
      } finally {
        removing.current = false;
      }
    });
  }

  return (
    <>
      {refused.length > 0 ? (
        <Panel className="mb-4 border-danger-line">
          <PanelHeader
            title="Needs attention"
            description="Bills made offline that the server refused. None of them is in the day's books yet."
            action={<Badge variant="destructive">{refused.length}</Badge>}
          />
          <ul className="divide-y">
            {refused.map((entry) => (
              <li key={entry.clientId} className="px-card py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-sm">
                    {/* The number on the customer's slip, to find the bill by (P7.17, QA-39). */}
                    <span className="font-medium">{entry.bill.bookNo ? slipLabel(entry.bill.bookNo) : "Made offline"}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatDateTime(entry.madeAt)} · {entry.madeBy || "unknown"} · for {formatDate(entry.businessDate)}
                    </span>
                  </p>
                  <p className="font-semibold tabular-nums">{rs(entry.preview.total)}</p>
                </div>

                {entry.preview.customerName ? <p className="mt-1 text-sm">{entry.preview.customerName}</p> : null}
                <ul className="mt-1 space-y-0.5 text-sm">
                  {entry.preview.lines.map((line, index) => (
                    <li key={index} className="flex justify-between gap-3">
                      <span className="min-w-0">
                        {line.name} <span className="text-muted-foreground">· {line.staffName}</span>
                      </span>
                      <span className="shrink-0 tabular-nums">{rs(line.amount)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-muted-foreground">
                  Paid: {paidBy(entry.bill.cash, entry.bill.online)}
                </p>
                <DiscountNote amount={entry.bill.discount} reason={entry.bill.discountReason} className="flex" />

                <p className="mt-2.5 flex items-start gap-1.5 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{entry.rejected?.reason}</span>
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {fixing === entry.clientId ? (
                    <Badge variant="secondary">Open on the screen below</Badge>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => router.push(`/billing?fix=${entry.clientId}`)}>
                        Open in billing
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => sendAgain(entry)}>
                        Send again
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => openRemove(entry)}>
                        Remove
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {notice ? (
        <p role="status" className="mb-4 flex items-center gap-1.5 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          {notice}
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={(next) => !next && setOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove this bill without saving it?</DialogTitle>
            <DialogDescription>
              It is not in the day&apos;s books and will not be. Remove it only if the money was never taken, or the
              bill has been rung up again. The bill and your reason go to the audit log.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason (required), e.g. rung up again as a new bill"
            aria-label="Reason for removing the bill"
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
            <Button variant="destructive" onClick={confirmRemove} disabled={pending}>
              {pending ? "Removing..." : "Remove bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
