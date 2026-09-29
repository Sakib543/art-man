import { Lock } from "lucide-react";
import { formatDate, formatTime } from "@/lib/format";
import type { OutboxCloseEntry } from "@/lib/offline/outbox";
import { cn } from "@/lib/utils";

/**
 * Why a screen will not add to a day that was closed on this computer and
 * whose close has not reached the server yet (P2.2f). The drawer has been
 * counted: a bill or an entry put into the day now would not be in that count.
 * Online as well as offline — until the close arrives, the server still has
 * the day open and would take it.
 */
export function closedHereText(close: OutboxCloseEntry, what: "bill" | "entry"): string {
  const then = `${formatDate(close.businessDate)} was closed on this computer at ${formatTime(close.madeAt)}, so nothing more goes into it.`;
  const meanwhile =
    what === "bill"
      ? "Until the next day is started, write bills in the paper bill book."
      : "Until the next day is started, write entries down.";
  return close.rejected
    ? `${then} The server refused that close: open Day close to close the day again, or to remove it. ${meanwhile}`
    : `${then} The next day is started on Day close once the close has reached the server. ${meanwhile}`;
}

export function ClosedHereNote({
  close,
  what,
  className,
}: {
  close: OutboxCloseEntry;
  what: "bill" | "entry";
  className?: string;
}) {
  return (
    <p
      role="note"
      className={cn(
        "mb-4 flex items-start gap-2 rounded-lg border border-warning-line bg-warning-soft px-3.5 py-2.5 text-sm text-warning",
        className,
      )}
    >
      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {closedHereText(close, what)}{" "}
        <a href="/day-close" className="font-medium underline underline-offset-2">
          Day close
        </a>
      </span>
    </p>
  );
}
