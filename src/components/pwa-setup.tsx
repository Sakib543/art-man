"use client";

import { useEffect } from "react";

/**
 * Registers the service worker and asks the browser to keep this site's
 * storage (P2.2a). Renders nothing.
 *
 * Production only. In `next dev` the worker would keep serving yesterday's
 * `/_next/static` files from its cache, so any worker left behind by a local
 * `pnpm start` on the same port is removed instead — otherwise the dev server
 * would appear to ignore every edit.
 *
 * Persistent storage matters from P2.2b on, when the catalog and unsent bills
 * live in the browser: without it the browser may clear them under disk
 * pressure. Chrome grants it silently to an installed app and refuses silently
 * otherwise, so asking on every load costs nothing.
 */
export function PwaSetup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())));
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      // The worker keeps its copy of the offline page up to date whenever that
      // page is fetched while online, so fetch it once per load. Without this a
      // changed offline.html would only reach the counter with a new worker.
      .then(() => fetch("/offline.html", { cache: "no-cache" }))
      .catch((error) => console.error("Service worker setup failed", error));

    void navigator.storage
      ?.persisted?.()
      .then((persisted) => persisted || navigator.storage.persist())
      .catch(() => undefined);
  }, []);

  return null;
}
