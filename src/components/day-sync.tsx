"use client";

import { useEffect } from "react";
import { DAY_REFRESH_EVERY_MS, DAY_URL, isDayCopy } from "@/lib/offline/day";
import { saveDay } from "@/lib/offline/store";
import { useConnectivity } from "./use-connectivity";

/** A copy that takes longer than this is given up on and tried again later. */
const FETCH_TIMEOUT_MS = 30_000;

/** The running `DaySync`s' ways to fetch now. There is one per page. */
const asked = new Set<() => void>();

/**
 * Ask for a fresh copy of the day now (P2.2e) — after anything that changed
 * it: a bill saved or cancelled, a folder entry added or cancelled, the
 * outbox saving what was made offline. If the internet then goes, the offline
 * screens show the day as it was a moment ago, not up to five minutes ago.
 * Does nothing while offline, or where no `DaySync` is mounted.
 */
export function requestDayRefresh() {
  asked.forEach((refresh) => refresh());
}

/**
 * Keeps the browser's copy of the open day current (backlog P2.2e): its bills
 * and folder entries, for the offline screens. Renders nothing. Mounted in the
 * signed-in shell and on the offline pages.
 *
 * It fetches when it mounts, every time the server comes back after being out
 * of reach, whenever `requestDayRefresh()` asks, every `DAY_REFRESH_EVERY_MS`,
 * and when the tab is shown again after a minute or more. A failed fetch keeps
 * the old copy, which the offline screens date ("as of").
 */
export function DaySync() {
  const online = useConnectivity();

  useEffect(() => {
    if (!online) return;

    let running: AbortController | null = null;
    let again = false;
    let stopped = false;
    let lastSaved = 0;

    async function refresh() {
      if (stopped) return;
      if (running) {
        // The day changed while this fetch was on its way; it may have read
        // it before the change. Fetch once more when it ends.
        again = true;
        return;
      }

      const controller = new AbortController();
      running = controller;
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        // `manual`: with no session the proxy redirects to /login. Anything
        // but a 200 keeps the old copy.
        const response = await fetch(DAY_URL, { cache: "no-store", redirect: "manual", signal: controller.signal });
        if (response.status !== 200) return;
        const copy: unknown = await response.json();
        if (!isDayCopy(copy) || controller.signal.aborted) return;
        await saveDay(copy);
        lastSaved = Date.now();
      } catch (error) {
        if (!controller.signal.aborted) console.warn("Could not refresh the offline copy of the day", error);
      } finally {
        clearTimeout(timer);
        running = null;
        if (again && !stopped) {
          again = false;
          void refresh();
        }
      }
    }

    const now = () => void refresh();
    void refresh();
    asked.add(now);
    const interval = setInterval(now, DAY_REFRESH_EVERY_MS);
    // Coming back to the tab after a while: another device may have changed the day.
    const onShow = () => {
      if (document.visibilityState === "visible" && Date.now() - lastSaved > 60_000) now();
    };
    document.addEventListener("visibilitychange", onShow);

    return () => {
      // Signing out unmounts this and clears the copy; a fetch still running
      // then must not put it back. Going offline lands here too.
      stopped = true;
      running?.abort();
      asked.delete(now);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [online]);

  return null;
}
