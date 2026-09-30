/**
 * What the error screen says when a screen could not load (backlog P7.11,
 * QA-30). It used to say "the system could not reach the database" every
 * time, and to send the counter to the paper bill book — for a bug in one
 * screen too (seen on Partners, P7.4), while every other screen worked.
 *
 * Now it says what it knows: the server did not answer at all (the internet),
 * the server answered but its database did not (`/api/health`), or neither —
 * a fault in that screen. The paper bill book, and offline billing, only for
 * the first two: they are the cases where billing on this screen cannot work.
 *
 * Pure.
 */

export type LoadFailure = "offline" | "database" | "screen";

/**
 * `online`: the connectivity probe reached the server. `database`: what the
 * health route said — null while it is being asked, or when it could not tell,
 * which reads as a fault in the screen: the one thing never claimed is a cause
 * that was not seen.
 */
export function loadFailureOf(online: boolean, database: boolean | null): LoadFailure {
  if (!online) return "offline";
  if (database === false) return "database";
  return "screen";
}

export interface FailureWords {
  title: string;
  /** What happened, and that it is not the person's doing. */
  cause: string;
  /** What to do now. */
  advice: string;
  /** Offer the offline page beside the advice: billing cannot wait for this to clear. */
  offerOffline: boolean;
}

const NOT_YOU = "This is a fault in the system, not something you did, and nothing already saved has been lost.";

export function failureWords(failure: LoadFailure): FailureWords {
  switch (failure) {
    case "offline":
      return {
        title: "No internet",
        cause: "This computer cannot reach the server, so the screen could not load. Nothing already saved has been lost.",
        advice:
          "Bill offline until the internet is back — the bills go to the server by themselves — or use the paper bill book and enter those bills once it is.",
        offerOffline: true,
      };
    case "database":
      return {
        title: "The system's database is not answering",
        cause: `The server is up, but its database did not answer, so the screen could not load. ${NOT_YOU}`,
        advice:
          "Try again in a minute. Until it answers, bill offline — the bills go to the server once the database is back — or use the paper bill book and enter those bills later.",
        offerOffline: true,
      };
    case "screen":
      return {
        title: "This screen could not be loaded",
        cause: `Something went wrong while loading it. ${NOT_YOU}`,
        advice:
          "Try again. Other screens may still work. If this one keeps failing, give the developer the reference below.",
        offerOffline: false,
      };
  }
}
