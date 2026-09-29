"use client";

import { useSyncExternalStore } from "react";
import type { OutboxItem } from "@/lib/offline/outbox";
import { onOutboxChange, readOutbox } from "@/lib/offline/store";

/**
 * The outbox as the screens see it (P2.2c): everything in it — bills, and
 * since P2.2e folder entries, since P2.2f day closes — oldest first, read again whenever it changes,
 * in this tab or another. One store for the page, started by the first
 * component that listens and stopped when the last one leaves, like the
 * connectivity store beside it.
 */

const NONE: OutboxItem[] = [];

let entries: OutboxItem[] = NONE;
/** Whether the outbox has been read at least once on this page (P2.2f). */
let ready = false;
const listeners = new Set<() => void>();
let stopWatching: (() => void) | null = null;
let reading = false;
let readAgain = false;

async function refresh() {
  if (reading) {
    readAgain = true;
    return;
  }
  reading = true;
  try {
    entries = await readOutbox();
  } catch {
    // No IndexedDB here (a locked-down browser): there is nothing to show.
    entries = NONE;
  } finally {
    reading = false;
    ready = true;
  }
  listeners.forEach((listener) => listener());
  if (readAgain) {
    readAgain = false;
    void refresh();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    stopWatching = onOutboxChange(() => void refresh());
    void refresh();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    stopWatching?.();
    stopWatching = null;
  };
}

/**
 * Everything in the outbox. Empty on the server and until the first read.
 * `isBillItem` / `isFolderItem` (`lib/offline/outbox.ts`) pick one kind.
 */
export function useOutbox(): OutboxItem[] {
  return useSyncExternalStore(
    subscribe,
    () => entries,
    () => NONE,
  );
}

/**
 * False until the outbox has been read (P2.2f): an empty `useOutbox()` before
 * then means "not read yet", not "empty". A screen that must not offer
 * something while the outbox might forbid it — Day close — waits for this.
 */
export function useOutboxReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => ready,
    () => false,
  );
}

/**
 * Why the last send stopped short, when it was for a reason a person can fix:
 * nobody is signed in any more. Set by the sync, read by the status line.
 */
let signedOut = false;
const problemListeners = new Set<() => void>();

export function setSyncSignedOut(next: boolean) {
  if (next === signedOut) return;
  signedOut = next;
  problemListeners.forEach((listener) => listener());
}

function subscribeProblem(listener: () => void) {
  problemListeners.add(listener);
  return () => {
    problemListeners.delete(listener);
  };
}

export function useSyncSignedOut(): boolean {
  return useSyncExternalStore(
    subscribeProblem,
    () => signedOut,
    () => false,
  );
}
