import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate: only checks that a session cookie exists, so signed-out
 * visitors are sent to /login quickly. It does NOT prove the session is valid
 * or check roles; every page does that itself via `requireUser` / `requireRole`.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (pathname === "/login") {
    return hasSession ? NextResponse.redirect(new URL("/billing", request.url)) : NextResponse.next();
  }
  if (!hasSession) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  // Everything except the auth API, Next internals and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
