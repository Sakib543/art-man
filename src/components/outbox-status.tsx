"use client";

import { CloudUpload, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { countOf, describeCounts, isCloseItem, NO_COUNTS, outboxTally, workOfDay } from "@/lib/offline/outbox";
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
 * entries, since P2.2f a day's close — and, louder, what the server refused,
 * which needs a person. It renders nothing when the outbox is empty, which is
 * almost always.
 *
 * Refused bills are listed in full on Billing, refused entries on Daily
 * folders and a refused close on Day close ("Needs attention"), so each screen
 * leaves its own kind out here.
 */
export function OutboxStatus() {
  const items = useOutbox();
  const signedOut = useSyncSignedOut();
  const pathname = usePathname();

  const { waiting, refused } = outboxTally(items);
  const refusedBills = pathname === "/billing" ? 0 : refused.bills;
  const refusedEntries = pathname === "/folders" ? 0 : refused.entries;
  const refusedCloses = pathname === "/day-close" ? 0 : refused.closes;
  const waitingCount = countOf(waiting);
  if (waitingCount === 0 && refusedBills === 0 && refusedEntries === 0 && refusedCloses === 0) return null;

  const one = waitingCount === 1;
  // A close waits for its day's work, and for a person when some of it was refused (P2.2f).
  const closeHeld = items.some(
    (item) =>
      isCloseItem(item) &&
      item.rejected === null &&
      workOfDay(items, item.businessDate).some((work) => work.rejected !== null),
  );

  return (
    <div className="mb-4 space-y-2 print:hidden">
      {refusedBills > 0 ? (
        <Refused
          what={describeCounts({ ...NO_COUNTS, bills: refusedBills })}
          count={refusedBills}
          href="/billing"
          label="Open Billing"
        />
      ) : null}
      {refusedEntries > 0 ? (
        <Refused
          what={describeCounts({ ...NO_COUNTS, entries: refusedEntries })}
          count={refusedEntries}
          href="/folders"
          label="Open Daily folders"
        />
      ) : null}
      {refusedCloses > 0 ? (
        <Refused
          what={describeCounts({ ...NO_COUNTS, closes: refusedCloses })}
          count={refusedCloses}
          href="/day-close"
          label="Open Day close"
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
            {closeHeld ? " The day's close goes once its refused bills and entries have been dealt with." : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}
