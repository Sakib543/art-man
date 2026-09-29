"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { unstable_isUnrecognizedActionError } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Panel, PanelHeader } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useOutbox } from "@/components/use-outbox";
import { formatDate, formatDateTime, rs } from "@/lib/format";
import { isCloseItem, type OutboxCloseEntry } from "@/lib/offline/outbox";
import { removeFromOutbox } from "@/lib/offline/store";
import { discardOfflineCloseAction } from "../actions";
import { differenceOf } from "../offline-close";

const OUTDATED = "The app was updated while this screen was open. Reload the page (F5) and try again.";

/**
 * Days closed offline whose close the server refused (backlog P2.2f), on the
 * Day close screen — the closes' "Needs attention", as Billing and Daily
 * folders have one. Each waits here, never dropped, until a person does one
 * of two things:
 *
 * - closes the day again — when it is the open day, the steps below start
 *   from what was entered then, under the same id, and closing takes it off;
 * - **Remove**, with a reason that goes to the audit log with the close —
 *   when the day was closed some other way, or the close was a mistake.
 *
 * `openDate` is the day the server has open, or null when none is.
 */
export function CloseAttention({ openDate }: { openDate: string | null }) {
  const refused = useOutbox()
    .filter(isCloseItem)
    .filter((item) => item.rejected !== null);

  // Kept after closing, so the dialog does not go blank while it animates out.
  const [target, setTarget] = useState<OutboxCloseEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  // Set the moment Remove is pressed, before the button can show it is busy,
  // so a second press is never sent (HANDOFF trap 8.17; the server writes one
  // removal anyway).
  const removing = useRef(false);

  if (refused.length === 0 && !notice) return null;

  function openRemove(item: OutboxCloseEntry) {
    setTarget(item);
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
          result = await discardOfflineCloseAction({ clientId: target.clientId, reason, close: target });
        } catch (thrown) {
          // Caught here, or the screen would fall over with the dialog open.
          return setError(
            unstable_isUnrecognizedActionError(thrown)
              ? OUTDATED
              : "The server could not be reached. Removing a close needs the internet — try again when it is back.",
          );
        }
        if (!result.ok) return setError(result.error);

        try {
          await removeFromOutbox(target.clientId);
        } catch {
          return setError("Recorded, but this browser could not take it off its list. Reload the page.");
        }
        setNotice(
          result.data.saved
            ? "That close had reached the server after all, so the day is closed. It is off this list."
            : "Removed. The close, its count and your reason are in the audit log.",
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
            description="Days closed offline whose close the server refused. The books have none of them."
            action={<Badge variant="destructive">{refused.length}</Badge>}
          />
          <ul className="divide-y">
            {refused.map((item) => {
              const difference = differenceOf(item.close);
              return (
                <li key={item.clientId} className="px-card py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Close of {formatDate(item.businessDate)}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · made offline {formatDateTime(item.madeAt)} · {item.madeBy || "unknown"}
                      </span>
                    </p>
                    <p className="text-sm tabular-nums">
                      Counted <span className="font-semibold">{rs(item.close.counted)}</span> against{" "}
                      {rs(item.close.expected)}
                      {difference !== 0 ? ` (${difference < 0 ? "short" : "extra"} ${rs(Math.abs(difference))})` : ""}
                    </p>
                  </div>

                  <p className="mt-2.5 flex items-start gap-1.5 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>{item.rejected?.reason}</span>
                  </p>

                  <p className="mt-2.5 text-sm text-muted-foreground">
                    {item.businessDate === openDate
                      ? "The steps below start from what was entered then. Check the count — count the drawer again if cash has come in or gone out since — and close the day again: that takes this off the list."
                      : "That day is not open on the server any more, so this close cannot be used. Remove it, with a reason."}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => openRemove(item)}>
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
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
            <DialogTitle>Remove this close without using it?</DialogTitle>
            <DialogDescription>
              The day is not closed by it and will not be. Remove it only if the day was closed some other way, or it
              will be closed again here. The close, its count and your reason go to the audit log.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason (required), e.g. closed again on the full screen"
            aria-label="Reason for removing the close"
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
              {pending ? "Removing..." : "Remove close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
