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
import { isFolderItem, type OutboxFolderEntry } from "@/lib/offline/outbox";
import { removeFromOutbox, setRejected } from "@/lib/offline/store";
import { discardOfflineEntryAction } from "../actions";
import { folderEntryText } from "../rows";

const OUTDATED = "The app was updated while this screen was open. Reload the page (F5) and try again.";

const KIND: Record<OutboxFolderEntry["entry"]["kind"], string> = {
  expense: "Expense",
  staff_advance: "Staff advance",
};

/**
 * Folder entries made offline that the server refused (backlog P2.2e), above
 * the Daily folders screen — the entries' "Needs attention", as Billing has
 * one for bills (P2.2c). Each waits here, never dropped, until a person does
 * one of two things:
 *
 * - **Send again**, once whatever was wrong has been put right — a day
 *   reopened, a staff member switched back on;
 * - **Remove**, with a reason that goes to the audit log with the entry —
 *   when it has been entered again on the open day, or the money never moved.
 *
 * There is no "open it here" as a refused bill has: an entry is one line, and
 * entering it again is quicker than putting it right.
 */
export function EntryAttention() {
  const refused = useOutbox()
    .filter(isFolderItem)
    .filter((item) => item.rejected !== null);

  // Kept after closing, so the dialog does not go blank while it animates out.
  const [target, setTarget] = useState<OutboxFolderEntry | null>(null);
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

  function sendAgain(item: OutboxFolderEntry) {
    setNotice("");
    setRejected(item.clientId, null)
      .then(() => setNotice("Sent again. If the server still refuses it, it comes back to this list with the reason."))
      .catch(() => setNotice("This browser could not change its list. Reload the page and try again."));
  }

  function openRemove(item: OutboxFolderEntry) {
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
          result = await discardOfflineEntryAction({ clientId: target.clientId, reason, entry: target });
        } catch (thrown) {
          // Caught here, or the screen would fall over with the dialog open.
          return setError(
            unstable_isUnrecognizedActionError(thrown)
              ? OUTDATED
              : "The server could not be reached. Removing an entry needs the internet — try again when it is back.",
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
            ? "It had reached the server after all, so it is in the day's folders. It is off this list."
            : "Removed. The entry and the reason are in the audit log.",
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
            description="Entries made offline that the server refused. None of them is in the day's folders yet."
            action={<Badge variant="destructive">{refused.length}</Badge>}
          />
          <ul className="divide-y">
            {refused.map((item) => (
              <li key={item.clientId} className="px-card py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-sm">
                    <span className="font-medium">{KIND[item.entry.kind]}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · made offline {formatDateTime(item.madeAt)} · {item.madeBy || "unknown"} · for{" "}
                      {formatDate(item.businessDate)}
                    </span>
                  </p>
                  <p className="font-semibold tabular-nums">{rs(item.entry.amount)}</p>
                </div>
                <p className="mt-1 text-sm">
                  {folderEntryText(item)}
                  {item.entry.kind === "expense" && item.entry.paidFrom === "owner" ? (
                    <span className="text-xs text-muted-foreground"> (paid by Owner, not from drawer)</span>
                  ) : null}
                </p>

                <p className="mt-2.5 flex items-start gap-1.5 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{item.rejected?.reason}</span>
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => sendAgain(item)}>
                    Send again
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => openRemove(item)}>
                    Remove
                  </Button>
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
            <DialogTitle>Remove this entry without saving it?</DialogTitle>
            <DialogDescription>
              It is not in the day&apos;s folders and will not be. Remove it only if the money never moved, or it has
              been entered again. The entry and your reason go to the audit log.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason (required), e.g. entered again on the open day"
            aria-label="Reason for removing the entry"
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
              {pending ? "Removing..." : "Remove entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
