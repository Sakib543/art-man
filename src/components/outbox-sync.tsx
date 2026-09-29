"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent } from "react";
import { nextToSend, outcomeOf, syncOf, type OutboxItem, type SyncOutcome } from "@/lib/offline/outbox";
import { onOutboxChange, readOutbox, removeFromOutbox, setRejected } from "@/lib/offline/store";
import { requestDayRefresh } from "./day-sync";
import { useConnectivity } from "./use-connectivity";
import { setSyncSignedOut } from "./use-outbox";

/** How often to try again while bills are waiting and the server is thought reachable. */
const RETRY_EVERY_MS = 30_000;

/**
 * A send that takes longer than this is given up on. It may have been saved
 * all the same; sending it again is safe, because the server saves one id
 * once (P3.15, P2.2e).
 */
const SEND_TIMEOUT_MS = 30_000;

/** One tab sends at a time. */
const LOCK = "art-man-outbox";

/** A bill to the bill route, a folder entry to the folder route (P2.2e). */
async function send(item: OutboxItem): Promise<SyncOutcome> {
  const { url, body: request, kind } = syncOf(item);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
      // With no session cookie the proxy redirects to /login; `outcomeOf`
      // reads the unfollowed redirect as "signed out".
      redirect: "manual",
      signal: controller.signal,
    });
    const body: unknown = await response.json().catch(() => null);
    return outcomeOf(response, body, kind);
  } catch {
    // The network, or the timeout: nothing is known about what was sent.
    return { kind: "later" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Send everything waiting, oldest first — bills and folder entries in the
 * order they were made — until the outbox is empty or one cannot be sent now.
 */
async function sendAll(stopped: () => boolean, onSaved: () => void) {
  for (;;) {
    if (stopped()) return;
    const next = nextToSend(await readOutbox());
    if (!next) return;

    const outcome = await send(next);
    switch (outcome.kind) {
      case "saved":
        setSyncSignedOut(false);
        await removeFromOutbox(next.clientId);
        // The day's copy now lacks it on both sides — out of the outbox, not
        // yet in the copy — until it is fetched again (P2.2e).
        requestDayRefresh();
        onSaved();
        continue;
      case "rejected":
        // A refusal is an answer from a signed-in session, too.
        setSyncSignedOut(false);
        await setRejected(next.clientId, { reason: outcome.reason, at: new Date().toISOString() });
        continue;
      case "signed-out":
        setSyncSignedOut(true);
        return;
      case "later":
        // The next bill would meet the same wall. Try again on the next turn.
        return;
    }
  }
}

/**
 * Only one tab sends at a time (Web Locks): a second tab finding the lock
 * taken leaves the work to the first. Where the browser has no locks, two
 * tabs may send the same bill — still safe, as the server saves one id once.
 */
async function exclusively(work: () => Promise<void>): Promise<void> {
  if (!navigator.locks) return work();
  await navigator.locks.request(LOCK, { ifAvailable: true }, async (lock) => {
    if (lock) await work();
  });
}

/**
 * Sends the outbox (backlog P2.2c, P2.2e) to the server. Renders nothing.
 * Mounted in the signed-in shell and on the offline pages, so it runs on every
 * screen.
 *
 * It sends while the server can be reached: when the shell loads, when the
 * connection comes back, whenever something is queued (in any tab), and every
 * `RETRY_EVERY_MS` while anything is waiting. Each answer decides what happens
 * to what was sent (`outcomeOf`): saved ones leave the outbox, refused ones
 * wait for a person, and everything else is simply tried again later.
 *
 * Whatever reaches the server leaves the screen's "not sent yet" lists at
 * once, while the screen's own rows come from the server and do not have it
 * yet — so after a pass that saved anything the screen is refreshed (P2.2e),
 * or it would seem to vanish until the next page load. The offline pages pass
 * `refreshScreen={false}`: they are drawn from the copy of the day, which is
 * fetched again instead.
 */
export function OutboxSync({ refreshScreen = true }: { refreshScreen?: boolean }) {
  const online = useConnectivity();
  const router = useRouter();
  const onSavedSome = useEffectEvent(() => {
    if (refreshScreen) router.refresh();
  });

  useEffect(() => {
    if (!online) return;

    let stopped = false;
    let running = false;
    let again = false;
    let warned = false;

    async function pass() {
      if (stopped) return;
      if (running) {
        // Something changed while sending: look again once this pass ends.
        again = true;
        return;
      }
      running = true;
      let savedSome = false;
      try {
        await exclusively(() =>
          sendAll(
            () => stopped,
            () => {
              savedSome = true;
            },
          ),
        );
      } catch (error) {
        // IndexedDB refusing is the likely cause, and it would say so every
        // turn; once is enough.
        if (!warned) console.warn("Could not send the outbox", error);
        warned = true;
      } finally {
        running = false;
      }
      if (savedSome && !stopped) onSavedSome();
      if (again && !stopped) {
        again = false;
        void pass();
      }
    }

    void pass();
    const interval = setInterval(() => void pass(), RETRY_EVERY_MS);
    const stopWatching = onOutboxChange(() => void pass());

    return () => {
      // Going offline, or signing out. A send already on its way still
      // finishes, and its answer is still recorded: it is a real answer.
      stopped = true;
      clearInterval(interval);
      stopWatching();
    };
  }, [online]);

  return null;
}
