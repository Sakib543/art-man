import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { getOpenBusinessDay } from "@/db/queries/business-day";
import { getDayEntries } from "@/db/queries/day-entries";
import { bills, customers, staff } from "@/db/schema";
import type { FoldersData, OnlineRow } from "./types";

/** Everything the Daily folders screen needs, or null when no business day is open. */
export async function getFoldersData(): Promise<FoldersData | null> {
  const day = await getOpenBusinessDay();
  if (!day) return null;

  const [entries, onlineRows, staffRows] = await Promise.all([
    getDayEntries(day.businessDate),
    db
      .select({
        id: bills.id,
        billNo: bills.billNo,
        clientId: bills.clientId,
        createdAt: bills.createdAt,
        amount: bills.online,
        customerName: customers.name,
      })
      .from(bills)
      .leftJoin(customers, eq(bills.customerId, customers.id))
      .where(and(eq(bills.businessDate, day.businessDate), ne(bills.online, 0)))
      .orderBy(desc(bills.createdAt)),
    db.select({ id: staff.id, name: staff.name }).from(staff).where(eq(staff.active, true)).orderBy(asc(staff.name)),
  ]);

  const online: OnlineRow[] = onlineRows.map((row) => ({
    key: row.id,
    ref: `#${row.billNo}`,
    clientId: row.clientId,
    createdAt: row.createdAt.toISOString(),
    customerName: row.customerName,
    amount: row.amount,
    pending: false,
  }));

  return { businessDate: day.businessDate, entries, online, staff: staffRows };
}
