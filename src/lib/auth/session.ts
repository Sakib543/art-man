import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { readMaintenance } from "@/db/app-settings";
import { auth } from "./server";
import { canAccess, isRole, type Role } from "./roles";

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

/**
 * Any signed-in user. Redirects to /login otherwise.
 *
 * This is also where maintenance mode bites. Every page and every Server
 * Action goes through here, so one check covers all of them — a layout would
 * not, because layouts do not re-run on client navigation. The developer is
 * let through, otherwise they could not switch the site back on.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "developer" && (await readMaintenance()).on) redirect("/maintenance");
  return user;
}

/**
 * Only the given roles. A manager opening an owner page is sent back to the
 * counter. The developer passes every check except `requireRole("developer")`,
 * which only they pass — see `canAccess`.
 */
export async function requireRole(...allowed: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccess(user.role, allowed)) redirect("/billing");
  return user;
}
