import { asc, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { readMaintenance, type Maintenance } from "@/db/app-settings";
import {
  auditLog,
  billCancellations,
  billLines,
  bills as billsTable,
  businessDays,
  monthCloses,
  staff,
  user as userTable,
} from "@/db/schema";
import { isRole, type Role } from "@/lib/auth/roles";
import { monthOf, monthStart } from "@/lib/business-date";

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

export interface EditableBillLine {
  id: string;
  name: string;
  amount: number;
  staffId: string;
}

export interface EditableBill {
  id: string;
  billNo: number;
  businessDate: string;
  cash: number;
  online: number;
  bookNo: string | null;
  createdBy: string;
  lines: EditableBillLine[];
  /** The day's close has already been written, so an edit must settle it again. */
  dayClosed: boolean;
  /** The month's closing report was frozen and will no longer match. */
  monthClosed: boolean;
}

/** Why a bill cannot be edited, or null when it can. */
export type BillEditBlock = "not-found" | "reversal" | "cancelled";

export interface BillLookup {
  bill: EditableBill | null;
  block: BillEditBlock | null;
}

/**
 * Find one bill by its receipt number, for the developer's edit screen.
 *
 * A reversal bill and a cancelled bill are refused here rather than on save:
 * both are half of a pair whose amounts mirror each other, and changing one
 * side in place would leave the day's totals wrong in a way nothing else
 * checks.
 */
export async function findBillForEdit(billNo: number): Promise<BillLookup> {
  const [bill] = await db.select().from(billsTable).where(eq(billsTable.billNo, billNo)).limit(1);
  if (!bill) return { bill: null, block: "not-found" };
  if (bill.reversesBillId) return { bill: null, block: "reversal" };

  const [cancelled] = await db
    .select({ billId: billCancellations.billId })
    .from(billCancellations)
    .where(eq(billCancellations.billId, bill.id))
    .limit(1);
  if (cancelled) return { bill: null, block: "cancelled" };

  const [lines, [day], [monthClose]] = await Promise.all([
    db.select().from(billLines).where(eq(billLines.billId, bill.id)).orderBy(asc(billLines.name)),
    db.select({ closedAt: businessDays.closedAt }).from(businessDays).where(eq(businessDays.businessDate, bill.businessDate)).limit(1),
    db.select({ month: monthCloses.month }).from(monthCloses).where(eq(monthCloses.month, monthStart(monthOf(bill.businessDate)))).limit(1),
  ]);

  return {
    bill: {
      id: bill.id,
      billNo: bill.billNo,
      businessDate: bill.businessDate,
      cash: bill.cash,
      online: bill.online,
      bookNo: bill.bookNo,
      createdBy: bill.createdBy,
      lines: lines.map((line) => ({ id: line.id, name: line.name, amount: line.amount, staffId: line.staffId })),
      dayClosed: Boolean(day?.closedAt),
      monthClosed: Boolean(monthClose),
    },
    block: null,
  };
}

/** Everyone who can be put on a bill line. Inactive staff are included: a bill may be old. */
export async function listStaffForEdit(): Promise<{ id: string; name: string; active: boolean }[]> {
  return db
    .select({ id: staff.id, name: staff.name, active: staff.active })
    .from(staff)
    .orderBy(asc(staff.name));
}
