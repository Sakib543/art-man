"use client";

import { unstable_isUnrecognizedActionError } from "next/navigation";
import { useState } from "react";

/**
 * The id a form sends its Save under (P7.2), as billing does (P3.15). It stays
 * the same until the form hears the save worked, so a double press or a retry
 * after a lost answer is answered "already saved" by the server (`saveOnce`)
 * instead of saving twice. `next` gives the form a fresh one for the next save.
 */
export function useSaveId(): [id: string, next: () => void] {
  const [id, setId] = useState(() => crypto.randomUUID());
  return [id, () => setId(crypto.randomUUID())];
}

/**
 * What to say when a Save threw instead of answering. Caught, because a
 * rejected action inside a transition takes the whole screen down to the error
 * boundary (HANDOFF section 7). `savesOnce`: the form sends a save id, so
 * pressing again is safe.
 */
export function thrownSaveMessage(thrown: unknown, savesOnce: boolean): string {
  // A screen from before the latest deploy: the server does not know this Save, so it never ran.
  if (unstable_isUnrecognizedActionError(thrown)) {
    return "The app was updated while this screen was open, so this was not saved. Reload the page (F5) and try again.";
  }
  return savesOnce
    ? "The connection dropped before the answer came back. Press it again when the internet is back: it is never saved twice."
    : "The connection dropped before the answer came back, so it is not known whether this was saved. Check before trying again.";
}
