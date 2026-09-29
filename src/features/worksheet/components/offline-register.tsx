"use client";

import { Info } from "lucide-react";
import { OfflinePage } from "@/components/offline-page";
import { formatTime } from "@/lib/format";
import { RegisterView } from "./register-view";

/**
 * The register with no server (backlog P2.2e), at `/offline-register`: the
 * page the service worker opens when the Daily report cannot be loaded.
 *
 * The open day only — this browser keeps no other — drawn from its copy of
 * the day (the bills the server had when the internet was last here) and the
 * bills made offline since, still in the outbox.
 */
export function OfflineRegister() {
  return (
    <OfflinePage view="register" subtitle="The open day's bills as a column per person, as far as this computer knows.">
      {({ copy, businessDate, day }) => (
        <>
          <p className="mb-4 flex items-start gap-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {day ? (
              <span>
                Bills saved on the server are shown as of {formatTime(day.servedAt)}, when this computer last had the
                internet; bills made offline since are added after them.
              </span>
            ) : (
              <span>
                The bills saved on the server before the internet went are not on this computer, so only bills made
                here are shown. The full register is on the Daily report once the internet is back.
              </span>
            )}
          </p>
          <RegisterView
            bills={day?.bills ?? []}
            // Without the day's copy, the staff the catalog copy knows: all active.
            staff={day?.staff ?? copy.catalog.staff.map((member) => ({ ...member, active: true }))}
            businessDate={businessDate}
            standalone
          />
        </>
      )}
    </OfflinePage>
  );
}
