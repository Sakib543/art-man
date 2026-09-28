"use client";

import { useSyncExternalStore } from "react";
import type { OutboxEntry } from "@/lib/offline/outbox";
import { onOutboxChange, readOutbox } from "@/lib/offline/store";

/**
 * The outbox as the screens see it (P2.2c): every bill in it, oldest first,
 * read again whenever it changes — in this tab or another. One store for the
 * page, started by the first component that listens and stopped when the last
 * one leaves, like the connectivity store beside it.
 */

const NONE: OutboxEntry[] = [];

let entries: OutboxEntry[] = NONE;
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

/** Every bill in the outbox. Empty on the server and until the first read. */
export function useOutbox(): OutboxEntry[] {
  return useSyncExternalStore(
    subscribe,
    () => entries,
    () => NONE,
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
