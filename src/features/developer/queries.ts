import { asc, count, desc, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { readMaintenance, type Maintenance } from "@/db/app-settings";
import { auditLog, user as userTable } from "@/db/schema";
import { isRole, type Role } from "@/lib/auth/roles";

export const PAGE_SIZE = 50;

export interface AuditRow {
  id: string;
  createdAt: Date;
  actor: string;
  action: string;
  target: string | null;
  success: boolean;
  before: unknown;
  after: unknown;
}

export interface AuditPage {
  rows: AuditRow[];
  total: number;
  page: number;
  pages: number;
}

/**
 * The audit log, newest first. `search` matches the actor, the action or the
 * target — enough to answer "what did the owner do" or "who cancelled a bill"
 * without a query language.
 */
export async function getAuditPage(search: string, page: number): Promise<AuditPage> {
  const term = search.trim();
  const where = term
    ? or(
        ilike(auditLog.actor, `%${term}%`),
        ilike(auditLog.action, `%${term}%`),
        ilike(auditLog.target, `%${term}%`),
      )
    : undefined;

  const [{ total }] = await db.select({ total: count() }).from(auditLog).where(where);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), pages);

  const rows = await db
    .select({
      id: auditLog.id,
      createdAt: auditLog.createdAt,
      actor: auditLog.actor,
      action: auditLog.action,
      target: auditLog.target,
      success: auditLog.success,
      before: auditLog.before,
      after: auditLog.after,
    })
    .from(auditLog)
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(PAGE_SIZE)
    .offset((safePage - 1) * PAGE_SIZE);

  return { rows, total, page: safePage, pages };
}

export interface ManagedUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  hasPin: boolean;
}

/** Everyone who can log in, for the Passwords screen. */
export async function listUsers(): Promise<ManagedUser[]> {
  const rows = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      username: userTable.username,
      role: userTable.role,
      pinHash: userTable.pinHash,
    })
    .from(userTable)
    .orderBy(asc(userTable.username));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username ?? "",
    // A role the app no longer knows about should still be visible, not hidden.
    role: isRole(row.role) ? row.role : "manager",
    hasPin: Boolean(row.pinHash),
  }));
}

export const getMaintenance = (): Promise<Maintenance> => readMaintenance();
