import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./server";
import { isRole, type Role } from "./roles";

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: Role;
}

/**
 * Data access layer for auth. Every page and Server Action that touches data
 * calls one of these, so the check happens next to the data, not only in the
 * proxy. `cache` makes repeated calls in one request cost a single lookup.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { user } = session;
  const role = (user as { role?: unknown }).role;
  if (!isRole(role)) return null;

  return {
    id: user.id,
    name: user.name,
    username: (user as { username?: string | null }).username ?? "",
    role,
  };
});

/** Any signed-in user (owner or manager). Redirects to /login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Only the given roles. A manager opening an owner page is sent back to the counter. */
export async function requireRole(...allowed: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) redirect("/billing");
  return user;
}
