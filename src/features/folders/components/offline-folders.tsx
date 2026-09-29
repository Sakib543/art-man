"use client";

import { Info } from "lucide-react";
import { OfflinePage } from "@/components/offline-page";
import { formatTime } from "@/lib/format";
import { onlineRowsOf } from "../rows";
import { FoldersScreen } from "./folders-screen";

/**
 * Daily folders with no server (backlog P2.2e), at `/offline-folders`: the
 * page the service worker opens when Daily folders cannot be loaded.
 *
 * The day comes from this browser's copy of it — the entries and online
 * payments the server had when the internet was last here — and what was
 * made offline since is added from the outbox. A new expense or staff advance
 * goes to the outbox; the Owner's own cash waits for the internet.
 */
export function OfflineFolders() {
  return (
    <OfflinePage
      view="folders"
      subtitle="Expenses and staff advances are kept on this computer and sent when the internet is back."
    >
      {({ copy, businessDate, day }) => (
        <>
          <p className="mb-4 flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {day ? (
              <span>
                Entries saved on the server are shown as of {formatTime(day.servedAt)}, when this computer last had
                the internet; anything made since is added below.
              </span>
            ) : (
              <span>
                The entries saved on the server before the internet went are not on this computer, so only what is
                made here is shown. The day&apos;s full folders are on the full screen once the internet is back.
              </span>
            )}
          </p>
          {/* A new day's copy starts a clean screen for that day. */}
          <FoldersScreen
            key={businessDate}
            data={{
              businessDate,
              entries: day?.entries ?? [],
              online: onlineRowsOf(day?.bills ?? []),
              staff: copy.catalog.staff,
            }}
            offlineOnly
          />
        </>
      )}
    </OfflinePage>
  );
}
