/**
 * Did this request come from a page of this site?
 *
 * Next asks this of every Server Action before running it
 * (`node_modules/next/dist/server/app-render/action-handler.js`), and a Route
 * Handler gets no such check. The one that writes — the offline sync (P2.2c)
 * — asks it here, the same way: the host in the `Origin` header must be the
 * host the request was sent to, which is the first `X-Forwarded-Host` behind a
 * proxy such as Vercel's, and `Host` otherwise.
 *
 * A request with no `Origin` is let through, as Next lets it through: every
 * browser sends one with a POST, so only a hand-made request lacks it, and a
 * hand-made request carries nobody's cookies but its maker's. `Origin: null`
 * (a sandboxed frame, a file) is refused.
 */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  if (origin === null) return true;

  let originHost: string;
  try {
    originHost = origin === "null" ? "null" : new URL(origin).host;
  } catch {
    return false;
  }

  const forwarded = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwarded || headers.get("host");
  return !!host && originHost === host;
}
