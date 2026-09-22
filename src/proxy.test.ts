import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

/**
 * Guards the lockout loop of backlog P0.4.
 *
 * The proxy sees a cookie, never a session. If it ever again decides that a
 * cookie means "signed in" and sends the visitor away from /login, the app
 * becomes unusable for anyone holding a dead cookie: /login sends them to
 * /billing, `requireUser` sends them back, and the browser gives up. They
 * cannot reach the one page that would have fixed it.
 */

/** Better Auth's cookie name over plain http. The proxy only cares that it exists. */
const COOKIE = "better-auth.session_token=any-value-at-all";

const request = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3000${path}`, cookie ? { headers: { cookie } } : undefined);

/** Where this response sends the browser, or null when it lets it through. */
const redirectTarget = (response: Response): string | null => {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname : null;
};

describe("proxy", () => {
  it("lets a signed-out visitor reach the login page", () => {
    expect(redirectTarget(proxy(request("/login")))).toBeNull();
  });

  it("still lets them reach it when a cookie is present", () => {
    // The regression this file exists for. A cookie is not proof of a session,
    // so this must not redirect no matter what the cookie says.
    expect(redirectTarget(proxy(request("/login", COOKIE)))).toBeNull();
  });

  it("sends a visitor with no cookie to the login page", () => {
    expect(redirectTarget(proxy(request("/billing")))).toBe("/login");
  });

  it("lets a request with a cookie through to the page, which checks it properly", () => {
    expect(redirectTarget(proxy(request("/billing", COOKIE)))).toBeNull();
  });

  it("never forms a loop between /login and a signed-in page", () => {
    // Follow the proxy's own decisions the way a browser would. With the bug,
    // this alternated /login -> /billing -> /login for ever.
    const seen: string[] = [];
    let path = "/login";
    for (let hop = 0; hop < 10; hop++) {
      if (seen.includes(path)) throw new Error(`loop: ${[...seen, path].join(" -> ")}`);
      seen.push(path);
      const next = redirectTarget(proxy(request(path, COOKIE)));
      if (!next) break;
      path = next;
    }
    expect(seen).toEqual(["/login"]);
  });
});
