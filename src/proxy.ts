import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate: only checks that a session cookie exists, so signed-out
 * visitors are sent to /login quickly. It does NOT prove the session is valid
 * or check roles; every page does that itself via `requireUser` / `requireRole`.
 *
 * Because it cannot tell a live cookie from a dead one, it must never send
 * anyone *away* from /login (backlog P0.4). It used to: a cookie meant
 * "signed in", so /login redirected to /billing, `requireUser` found no real
 * session and redirected back, and the browser gave up with
 * ERR_TOO_MANY_REDIRECTS. The person was then locked out of the only page that
 * could have fixed it. A cookie outliving its session is ordinary — resetting
 * a password deletes every session that user has, and re-seeding or rotating
 * BETTER_AUTH_SECRET kills all of them at once.
 *
 * Whether someone is really signed in is decided by the login page, which asks
 * the database (`getCurrentUser`) and can answer it correctly.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always reachable, cookie or no cookie. This is the whole fix.
  if (pathname === "/login") return NextResponse.next();

  if (!getSessionCookie(request)) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  // Everything except the auth API, Next internals and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
