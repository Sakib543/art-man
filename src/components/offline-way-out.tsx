"use client";

import { WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { offlinePageFor } from "@/lib/offline/pages";
import { useConnectivity } from "./use-connectivity";

/**
 * A way out of a screen that cannot load because the internet went (P2.2d):
 * a link to its offline page — Daily folders and the Register have their own
 * since P2.2e, and anything else goes to offline billing. Shown on the loading
 * and error screens, and only while the server cannot be reached.
 *
 * Found verifying P2.2d: a page whose answer was cut off mid-way when the
 * connection dropped sat on its loading screen for good. A reload would have
 * reached the offline page — the service worker sends those screens there —
 * but nobody at the counter should have to know that.
 *
 * A plain link, not a client navigation: an offline page is a page of its
 * own, and the worker has to be the one to open it.
 */
export function OfflineWayOut() {
  const online = useConnectivity();
  const page = offlinePageFor(usePathname());
  if (online) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-warning-line bg-warning-soft px-3.5 py-2.5 text-sm text-warning"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">No internet, so this screen cannot load.</p>
      <a href={page.href} className="font-medium underline underline-offset-2">
        Open {page.view === "billing" ? "offline billing" : `${page.label} offline`}
      </a>
    </div>
  );
}
