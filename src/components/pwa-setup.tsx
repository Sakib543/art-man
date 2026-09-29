"use client";

import { useEffect } from "react";

/**
 * Ask the service worker to keep the offline pages and their files — Billing
 * (P2.2d), Daily folders and the Register (P2.2e). Only a signed-in request is
 * given them — signed out, the proxy redirects and the worker keeps nothing —
 * so this is asked again whenever a signed-in screen has just proved its
 * session (`catalog-sync.tsx`), not only when a page loads: signing in moves
 * to Billing without loading a page. Does nothing where no worker is
 * registered (`next dev`).
 */
export function keepOfflinePages() {
  if (!("serviceWorker" in navigator)) return;
  void navigator.serviceWorker
    .getRegistration()
    .then((registration) => registration?.active?.postMessage({ type: "cache-offline-pages" }))
    .catch(() => undefined);
}

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
 * pressure — and from P2.2d the offline pages and their files live in the
 * worker's caches too. Chrome grants it silently to an installed app and refuses silently
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
      // And the offline pages with every file they need (P2.2d, P2.2e), so
      // that after each deploy the counter can still work once the internet
      // goes. Signed out, the worker is refused them by the proxy and keeps
      // nothing.
      .then(() => navigator.serviceWorker.ready)
      .then(() => keepOfflinePages())
      .catch((error) => console.error("Service worker setup failed", error));

    // After a deploy that changed the worker, the request above can reach the
    // old one, which does not know it (found verifying P2.2d). Ask again the
    // moment the new worker takes over.
    navigator.serviceWorker.addEventListener("controllerchange", keepOfflinePages);

    void navigator.storage
      ?.persisted?.()
      .then((persisted) => persisted || navigator.storage.persist())
      .catch(() => undefined);

    return () => navigator.serviceWorker.removeEventListener("controllerchange", keepOfflinePages);
  }, []);

  return null;
}
