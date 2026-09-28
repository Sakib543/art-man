"use client";

import { useEffect, useRef } from "react";
import { CATALOG_URL, isCatalogCopy, REFRESH_EVERY_MS } from "@/lib/offline/catalog";
import { saveCatalog } from "@/lib/offline/store";
import { keepOfflineBilling } from "./pwa-setup";
import { useConnectivity } from "./use-connectivity";

/** How often to ask "is the copy too old?" — the answer is usually no. */
const CHECK_EVERY_MS = 60_000;

/** A copy that takes longer than this is given up on and tried again later. */
const FETCH_TIMEOUT_MS = 30_000;

/**
 * Keeps the browser's offline copy of the catalog current (backlog P2.2b).
 * Renders nothing. Mounted in the signed-in shell, so it runs on every screen.
 *
 * It fetches when the shell loads, every time the server comes back after
 * being out of reach, and whenever the copy is older than `REFRESH_EVERY_MS`
 * — checked each minute and whenever the tab is shown again. A failed fetch
 * keeps the old copy: an old copy is still better than none when the
 * internet goes.
 */
export function CatalogSync() {
  const online = useConnectivity();
  const lastSaved = useRef(0);

  useEffect(() => {
    if (!online) return;

    let running: AbortController | null = null;
    let stopped = false;

    async function refresh(force: boolean) {
      if (running || stopped) return;
      if (!force && Date.now() - lastSaved.current < REFRESH_EVERY_MS) return;

      const controller = new AbortController();
      running = controller;
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        // `manual`: with no session the proxy redirects to /login, and that
        // page's HTML is not a catalog. Anything but a 200 keeps the old copy.
        const response = await fetch(CATALOG_URL, { cache: "no-store", redirect: "manual", signal: controller.signal });
        if (response.status !== 200) return;
        const copy: unknown = await response.json();
        if (!isCatalogCopy(copy) || controller.signal.aborted) return;
        await saveCatalog(copy);
        lastSaved.current = Date.now();
        // The session is proven; now the worker can be given the offline
        // billing page too (P2.2d).
        keepOfflineBilling();
      } catch (error) {
        if (!controller.signal.aborted) console.warn("Could not refresh the offline catalog", error);
      } finally {
        clearTimeout(timer);
        running = null;
      }
    }

    void refresh(true);
    const interval = setInterval(() => void refresh(false), CHECK_EVERY_MS);
    const onShow = () => {
      if (document.visibilityState === "visible") void refresh(false);
    };
    document.addEventListener("visibilitychange", onShow);

    return () => {
      // Signing out unmounts this and clears the copy; a fetch still running
      // then must not put the copy back afterwards. Going offline lands here
      // too, where the fetch would have failed anyway.
      stopped = true;
      running?.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [online]);

  return null;
}
