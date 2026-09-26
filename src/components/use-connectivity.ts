"use client";

import { useSyncExternalStore } from "react";
import { nextCheckIn, reachesServer } from "@/lib/connectivity";

/**
 * Whether the server can be reached right now (P2.2a).
 *
 * One store for the whole page, started by the first component that listens
 * and stopped when the last one leaves. It trusts the browser's `offline`
 * event straight away — that one is never wrong — but confirms an `online`
 * event with a probe, because the device having a network is not the same as
 * the salon having internet.
 *
 * Next.js 16 has its own `useOffline`, behind `experimental.useOffline`. It is
 * deliberately not used: turning the flag on also makes a failed Server Action
 * re-send itself when the network returns, and a `createBill` whose *response*
 * was lost would then save the bill twice. See backlog P2.2.
 */

let online = true;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (next === online) return;
  online = next;
  for (const listener of listeners) listener();
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(check, nextCheckIn(online));
}

async function check() {
  set(navigator.onLine && (await reachesServer(fetch)));
  if (listeners.size > 0) schedule();
}

function goOffline() {
  set(false);
  schedule();
}

function recheck() {
  if (document.visibilityState === "visible") void check();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", recheck);
    document.addEventListener("visibilitychange", recheck);
    void check();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    window.removeEventListener("offline", goOffline);
    window.removeEventListener("online", recheck);
    document.removeEventListener("visibilitychange", recheck);
    clearTimeout(timer);
  };
}

/** The server renders as online; the first probe corrects it after hydration. */
export function useConnectivity(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => online,
    () => true,
  );
}
