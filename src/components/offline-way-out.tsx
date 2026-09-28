"use client";

import { WifiOff } from "lucide-react";
import { useConnectivity } from "./use-connectivity";

/**
 * A way out of a screen that cannot load because the internet went (P2.2d):
 * a link to offline billing. Shown on the loading and error screens, and only
 * while the server cannot be reached.
 *
 * Found verifying P2.2d: a page whose answer was cut off mid-way when the
 * connection dropped sat on its loading screen for good. A reload would have
 * reached offline billing — the service worker sends Billing there — but
 * nobody at the counter should have to know that.
 *
 * A plain link, not a client navigation: offline billing is its own page, and
 * the worker has to be the one to open it.
 */
export function OfflineWayOut() {
  const online = useConnectivity();
  if (online) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-warning-line bg-warning-soft px-3.5 py-2.5 text-sm text-warning"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">No internet, so this screen cannot load.</p>
      <a href="/offline-billing" className="font-medium underline underline-offset-2">
        Open offline billing
      </a>
    </div>
  );
}
