"use client";

import { Panel, PanelHeader } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { useOutbox } from "@/components/use-outbox";
import { formatDate, formatTime, paidBy, rs } from "@/lib/format";
import { isBillItem } from "@/lib/offline/outbox";

/**
 * Bills made with no internet that have not reached the server yet (backlog
 * P2.2d), above Today's bills. Today's bills comes from the server, so these
 * cannot be in it until they are sent — which happens by itself; nobody has to
 * do anything here. Renders nothing when there are none.
 *
 * The refused ones are not here: they wait in "Needs attention" (P2.2c).
 */
export function PendingBills({ className }: { className?: string }) {
  // Folder entries made offline are listed on Daily folders (P2.2e).
  const waiting = useOutbox().filter(isBillItem).filter((entry) => entry.rejected === null);
  if (waiting.length === 0) return null;

  return (
    <Panel className={className}>
      <PanelHeader
        title="Waiting to be sent"
        description="Made with no internet. They go to the server by themselves when it is back, and get their bill numbers then."
        action={<Badge variant="warning">{waiting.length}</Badge>}
      />
      <ul className="divide-y">
        {waiting.map((entry) => (
          <li key={entry.clientId} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-card py-3">
            <div className="min-w-0 space-y-0.5">
              <p className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold tabular-nums">{entry.bill.bookNo ?? "—"}</span>
                <Badge variant="warning">Pending</Badge>
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatTime(entry.madeAt)} · {formatDate(entry.businessDate)} · {paidBy(entry.bill.cash, entry.bill.online)}
              </p>
              {entry.preview.customerName ? <p className="text-sm">{entry.preview.customerName}</p> : null}
              {entry.preview.lines.map((line, index) => (
                <p key={index} className="text-sm">
                  {line.name} <span className="text-muted-foreground">· {line.staffName}</span>
                </p>
              ))}
            </div>
            <p className="font-semibold tabular-nums">{rs(entry.preview.total)}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
