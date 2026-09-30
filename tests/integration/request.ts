/**
 * The request a Server Action or a Route Handler is answering, as far as
 * `headers()` from `next/headers` can tell (mocked in `setup.ts`). A test sets
 * it before each call — whose session cookie, and which site the browser says
 * it is on.
 */
let current = new Headers();

export const requestHeaders = (): Headers => current;

export const SITE = "localhost:3000";

/** The next calls come from a browser on this site holding `cookie` — or from nobody signed in. */
export function asRequest(cookie: string | null, extra: Record<string, string> = {}) {
  current = new Headers({ host: SITE, origin: `http://${SITE}`, ...(cookie ? { cookie } : {}), ...extra });
}
