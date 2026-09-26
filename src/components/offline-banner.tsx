"use client";

import { WifiOff } from "lucide-react";
import { useEffect } from "react";
import { useConnectivity } from "./use-connectivity";

/**
 * A bar across the top of every screen while the server cannot be reached
 * (P2.2a). Nothing works offline yet, so it says so plainly and points at the
 * paper bill book (P2.1) — the counter should not find out by losing a bill.
 *
 * It marks `<html data-offline>` while shown. `globals.css` turns that into
 * `--offline-bar` (2.25rem, this bar's `h-9`), and the sticky mobile top bar
 * and the sidebar sit below it rather than underneath it.
 */
export function OfflineBanner() {
  const online = useConnectivity();

  useEffect(() => {
    document.documentElement.toggleAttribute("data-offline", !online);
  }, [online]);

  if (online) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex h-9 items-center justify-center gap-2 border-b border-warning-line bg-warning-soft px-4 text-center text-sm font-medium text-warning print:hidden"
    >
      <WifiOff aria-hidden className="size-4 shrink-0" />
      <span className="truncate">
        No internet — bills cannot be saved.
        <span className="hidden sm:inline"> Use the paper bill book until it is back.</span>
      </span>
    </div>
  );
}
