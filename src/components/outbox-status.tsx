"use client";

import { CloudUpload, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { describeCounts, outboxTally } from "@/lib/offline/outbox";
import { useOutbox, useSyncSignedOut } from "./use-outbox";

function Refused({ what, count, href, label }: { what: string; count: number; href: string; label: string }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-danger-line bg-danger-soft px-3.5 py-2.5 text-sm text-destructive"
    >
      <TriangleAlert className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">
        {what} made offline {count === 1 ? "was" : "were"} refused by the server and {count === 1 ? "needs" : "need"}{" "}
        attention.
      </p>
      <Link href={href} className="font-medium underline underline-offset-2">
        {label}
      </Link>
    </div>
  );
}

/**
 * A line at the top of every signed-in screen while the outbox holds anything
 * (P2.2c): how much is waiting to be sent — bills and, since P2.2e, folder
 * entries — and, louder, what the server refused, which needs a person. It
 * renders nothing when the outbox is empty, which is almost always.
 *
 * Refused bills are listed in full on Billing and refused entries on Daily
 * folders ("Needs attention"), so each screen leaves its own kind out here.
 */
export function OutboxStatus() {
  const items = useOutbox();
  const signedOut = useSyncSignedOut();
  const pathname = usePathname();

  const { waiting, refused } = outboxTally(items);
  const refusedBills = pathname === "/billing" ? 0 : refused.bills;
  const refusedEntries = pathname === "/folders" ? 0 : refused.entries;
  const waitingCount = waiting.bills + waiting.entries;
  if (waitingCount === 0 && refusedBills === 0 && refusedEntries === 0) return null;

  const one = waitingCount === 1;

  return (
    <div className="mb-4 space-y-2 print:hidden">
      {refusedBills > 0 ? (
        <Refused
          what={describeCounts({ bills: refusedBills, entries: 0 })}
          count={refusedBills}
          href="/billing"
          label="Open Billing"
        />
      ) : null}
      {refusedEntries > 0 ? (
        <Refused
          what={describeCounts({ bills: 0, entries: refusedEntries })}
          count={refusedEntries}
          href="/folders"
          label="Open Daily folders"
        />
      ) : null}

      {waitingCount > 0 ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border border-info-line bg-info-soft px-3.5 py-2.5 text-sm text-info"
        >
          <CloudUpload className="size-4 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">
            {describeCounts(waiting)} waiting to be sent to the server.{" "}
            {signedOut
              ? `Sign in again to send ${one ? "it" : "them"}.`
              : `${one ? "It goes" : "They go"} by ${one ? "itself" : "themselves"} as soon as the server can be reached.`}
          </p>
        </div>
      ) : null}
    </div>
  );
}
