import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { isRole, type Role } from "@/lib/auth/roles";
import { creatableRoles, visibleRoles } from "./rules";
import type { UserRow, UsersData } from "./types";

/**
 * The accounts this viewer manages. The filter is in SQL rather than in the
 * screen: a developer account must not reach the Owner's browser at all, not
 * even hidden in the page data.
 */
export async function getUsers(viewerRole: Role): Promise<UsersData> {
  const allowed = visibleRoles(viewerRole);

  const [rows, [{ activeOwners }]] = await Promise.all([
    db
      .select({
        id: userTable.id,
        name: userTable.name,
        username: userTable.username,
        role: userTable.role,
        active: userTable.active,
        pinHash: userTable.pinHash,
        createdAt: userTable.createdAt,
      })
      .from(userTable)
      .where(inArray(userTable.role, allowed))
      // Open accounts first, then by username, so a closed one never sits
      // between two working ones.
      .orderBy(asc(userTable.username)),
    db
      .select({ activeOwners: count() })
      .from(userTable)
      .where(and(eq(userTable.role, "owner"), eq(userTable.active, true))),
  ]);

  const mapped: UserRow[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username ?? "",
    // A role the app no longer knows about should still be visible, not hidden.
    role: isRole(row.role) ? row.role : "manager",
    active: row.active,
    hasPin: Boolean(row.pinHash),
    createdAt: row.createdAt.toISOString(),
  }));

  return {
    rows: [...mapped].sort((a, b) => Number(b.active) - Number(a.active)),
    creatable: creatableRoles(viewerRole),
    activeOwners,
  };
}

/** One account, as the guards in `rules.ts` need it. Null when it has gone. */
export async function findUser(userId: string) {
  const [row] = await db
    .select({ id: userTable.id, username: userTable.username, role: userTable.role, active: userTable.active })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (!row) return null;
  return { ...row, role: isRole(row.role) ? row.role : ("manager" as Role) };
}

/** How many Owner accounts are open right now. */
export async function countActiveOwners(): Promise<number> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(userTable)
    .where(and(eq(userTable.role, "owner"), eq(userTable.active, true)));
  return total;
}
