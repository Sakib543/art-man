"use client";

import { Info, TriangleAlert, WifiOff } from "lucide-react";
import { OfflinePage } from "@/components/offline-page";
import { Panel } from "@/components/panel";
import { useOutbox, useOutboxReady } from "@/components/use-outbox";
import { formatTime } from "@/lib/format";
import { closeOf, countOf, describeCounts, outboxTally, workOfDay } from "@/lib/offline/outbox";
import type { StoredDay } from "@/lib/offline/store";
import { localDayOf } from "../offline-close";
import { CloseWizard } from "./close-wizard";
import { ClosedHere } from "./closed-here";

/** The day from this computer's copies and outbox: closed here already, or the five steps. */
function OfflineClose({ businessDate, day }: { businessDate: string; day: StoredDay | null }) {
  const items = useOutbox();
  const ready = useOutboxReady();
  if (!ready) return <p className="py-6 text-sm text-muted-foreground">Reading this computer…</p>;

  const kept = closeOf(items, businessDate);
  if (kept) return <ClosedHere entry={kept} held={outboxTally(workOfDay(items, businessDate))} offlinePage />;

  const local = localDayOf(day, items, businessDate);
  if (!local.ok) {
    return (
      <Panel className="mx-auto max-w-md p-6 text-center">
        <WifiOff className="mx-auto size-8 text-warning" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold">The day cannot be closed offline here</h2>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">{local.reason}</p>
      </Panel>
    );
  }

  const { waiting, refused } = local.day.onThisComputer;
  const madeHere = countOf(waiting) + countOf(refused);

  return (
    <>
      <p className="mb-4 flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          The day as the server had it at {formatTime(local.day.servedAt)}, when this computer last had the internet
          {madeHere > 0
            ? `, and the ${describeCounts({ bills: waiting.bills + refused.bills, entries: waiting.entries + refused.entries, closes: 0 })} made here since`
            : ""}
          . The server checks it all again when the close reaches it.
        </span>
      </p>
      {countOf(refused) > 0 ? (
        <p
          role="note"
          className="mb-4 flex items-start gap-2 rounded-lg border border-warning-line bg-warning-soft px-3.5 py-2.5 text-sm text-warning"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {describeCounts(refused)} of this day {countOf(refused) === 1 ? "was" : "were"} refused by the server and{" "}
            {countOf(refused) === 1 ? "is" : "are"} counted here all the same: the money was taken. The close is sent
            only once {countOf(refused) === 1 ? "it has" : "they have"} been put right or removed on the full screens, and
            the server closes the day only if its books then come to the same expected cash.
          </span>
        </p>
      ) : null}
      <CloseWizard staff={local.day.staff} businessDate={businessDate} local={local.day} />
    </>
  );
}

/**
 * Day close with no server (backlog P2.2f), at `/offline-day-close`: the page
 * the service worker opens when Day close cannot be loaded.
 *
 * The day comes from this browser — the copy of the day (P2.2e, with what a
 * close needs since P2.2f) and the outbox — and the close goes to the outbox,
 * behind the day's bills and entries. The server makes the security code when
 * the close reaches it. Once closed here, the day takes nothing more from this
 * computer; the next day is started on the full screen, with the internet.
 */
export function OfflineDayClose() {
  return (
    <OfflinePage
      view="day-close"
      subtitle="The day is closed on this computer and the close is sent when the internet is back."
    >
      {({ businessDate, day }) => <OfflineClose key={businessDate} businessDate={businessDate} day={day} />}
    </OfflinePage>
  );
}
