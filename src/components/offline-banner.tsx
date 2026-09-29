"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { offlineTrust } from "@/lib/offline/session";
import { readCatalog } from "@/lib/offline/store";
import { useConnectivity } from "./use-connectivity";

/**
 * A bar across the top of every screen while the server cannot be reached
 * (P2.2a). It says plainly what the counter can do — the counter should not
 * find out by losing a bill:
 *
 * - with working offline ready (P2.2d: a copy on this computer, confirmed by
 *   the server within 12 hours), bills and folder entries (P2.2e) are kept
 *   and sent later;
 * - otherwise, the paper bill book (P2.1).
 *
 * It marks `<html data-offline>` while shown. `globals.css` turns that into
 * `--offline-bar` (2.25rem, this bar's `h-9`), and the sticky mobile top bar
 * and the sidebar sit below it rather than underneath it.
 */
export function OfflineBanner() {
  const online = useConnectivity();
  const [canKeep, setCanKeep] = useState(false);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-offline", !online);
  }, [online]);

  useEffect(() => {
    if (online) return;
    let cancelled = false;
    void readCatalog()
      .catch(() => null)
      .then((copy) => {
        if (!cancelled) setCanKeep(offlineTrust(copy?.savedAt ?? null, Date.now()).ok);
      });
    return () => {
      cancelled = true;
    };
  }, [online]);

  if (online) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex h-9 items-center justify-center gap-2 border-b border-warning-line bg-warning-soft px-4 text-center text-sm font-medium text-warning print:hidden"
    >
      <WifiOff aria-hidden className="size-4 shrink-0" />
      {canKeep ? (
        <span className="truncate">
          No internet — bills and entries are kept on this computer
          <span className="hidden sm:inline"> and sent when it is back</span>.
        </span>
      ) : (
        <span className="truncate">
          No internet — bills cannot be saved.
          <span className="hidden sm:inline"> Use the paper bill book until it is back.</span>
        </span>
      )}
    </div>
  );
}
