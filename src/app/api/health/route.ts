import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Can the server reach its database? (backlog P7.11, QA-30)
 *
 * Asked by the error screen (`components/error-card.tsx`) when a screen fails
 * to load, so it can say what happened instead of guessing: the server
 * answered, so the internet is up — is the database? 204 when it answers a
 * `select 1` within a few seconds, 503 when it does not. Nothing else is said,
 * and nothing is read or written.
 *
 * Behind the proxy like every page: a request with no session cookie is sent
 * to /login, which the screen reads as "cannot tell". The handler itself asks
 * for no session — checking one needs the database, the thing in question.
 */
const NO_STORE = { "Cache-Control": "no-store" };

/** Long enough for a cold Neon compute to wake; short enough for a person waiting on an error screen. */
const TIMEOUT_MS = 5_000;

async function reachesDatabase(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), TIMEOUT_MS);
  });
  try {
    return await Promise.race([db.execute(sql`select 1`).then(() => true as const), late]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  return new Response(null, { status: (await reachesDatabase()) ? 204 : 503, headers: NO_STORE });
}
