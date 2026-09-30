/**
 * Can the counter reach the server? (P2.2a)
 *
 * `navigator.onLine` is not the answer: it only reports whether the device has
 * a network interface up, so a counter on Wi-Fi whose internet has died still
 * reads `true`. The only honest test is to ask the server something.
 *
 * What is asked is the web app manifest: a tiny static file, served without a
 * session (the proxy skips any path with a dot in it), and never touched by the
 * service worker — so a cached copy cannot pretend the server answered.
 */

export const PROBE_URL = "/manifest.webmanifest";

/** How long a probe may take before the server counts as unreachable. Slow 4G is still online. */
export const PROBE_TIMEOUT_MS = 8_000;

/**
 * Any HTTP response means the server was reached — a 500 is a fault on the
 * server, not a lost connection. Only a network error or the timeout counts as
 * offline.
 */
export async function reachesServer(
  fetcher: typeof fetch,
  url: string = PROBE_URL,
  timeoutMs: number = PROBE_TIMEOUT_MS,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetcher(`${url}?probe=${Date.now()}`, { method: "HEAD", cache: "no-store", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * When to ask again. Online, rarely — it is only there to catch internet that
 * dies without the device noticing. Offline, often, so the banner goes away
 * soon after the connection comes back.
 */
export function nextCheckIn(online: boolean): number {
  return online ? 20_000 : 3_000;
}

/** Where the error screen asks whether the server reaches its database (P7.11). */
export const HEALTH_URL = "/api/health";

/**
 * Does the server reach its database? (P7.11, QA-30) Asked only once a screen
 * has failed, so the error screen can say which it was. True on the route's
 * 204, false on its 503, and null when it cannot tell: no answer in time, the
 * proxy sending a signed-out browser to /login, anything else.
 */
export async function databaseAnswers(
  fetcher: typeof fetch,
  url: string = HEALTH_URL,
  timeoutMs: number = PROBE_TIMEOUT_MS,
): Promise<boolean | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { cache: "no-store", redirect: "manual", signal: controller.signal });
    if (response.status === 204) return true;
    if (response.status === 503) return false;
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
