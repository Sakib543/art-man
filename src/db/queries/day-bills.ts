import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { billCancellations, billLines, bills, customers, staff } from "@/db/schema";
import type { Rupees } from "@/lib/accounting";

export interface DayBillLine {
  name: string;
  amount: Rupees;
  staffId: string;
  staffName: string;
}

export interface DayBill {
  id: string;
  billNo: number;
  createdAt: string;
  customerName: string | null;
  /** Cash plus online. Negative on a reversal bill. */
  total: Rupees;
  cash: Rupees;
  online: Rupees;
  /** The paper bill book's number, when this bill was written by hand first (spec 5.5). */
  bookNo: string | null;
  status: "active" | "cancelled" | "reversal";
  cancelReason: string | null;
  /** On a reversal bill: the number of the bill it cancels. */
  reversesBillNo: number | null;
  lines: DayBillLine[];
}

/** Every bill of one business day, newest first, with its lines and cancellation info. */
export async function getDayBills(businessDate: string): Promise<DayBill[]> {
  const rows = await db
    .select({
      id: bills.id,
      billNo: bills.billNo,
      createdAt: bills.createdAt,
      cash: bills.cash,
      online: bills.online,
      reversesBillId: bills.reversesBillId,
      bookNo: bills.bookNo,
      customerName: customers.name,
      cancelReason: billCancellations.reason,
    })
    .from(bills)
    .leftJoin(customers, eq(bills.customerId, customers.id))
    .leftJoin(billCancellations, eq(billCancellations.billId, bills.id))
    .where(eq(bills.businessDate, businessDate))
    .orderBy(desc(bills.billNo));

  if (rows.length === 0) return [];

  const lineRows = await db
    .select({
      billId: billLines.billId,
      name: billLines.name,
      amount: billLines.amount,
      staffId: billLines.staffId,
      staffName: staff.name,
    })
    .from(billLines)
    .innerJoin(staff, eq(billLines.staffId, staff.id))
    .where(inArray(billLines.billId, rows.map((row) => row.id)));

  const billNoById = new Map(rows.map((row) => [row.id, row.billNo]));

  return rows.map((row) => ({
    id: row.id,
    billNo: row.billNo,
    createdAt: row.createdAt.toISOString(),
    customerName: row.customerName,
    total: row.cash + row.online,
    cash: row.cash,
    online: row.online,
    bookNo: row.bookNo,
    status: row.reversesBillId ? "reversal" : row.cancelReason ? "cancelled" : "active",
    cancelReason: row.cancelReason,
    reversesBillNo: row.reversesBillId ? (billNoById.get(row.reversesBillId) ?? null) : null,
    lines: lineRows
      .filter((line) => line.billId === row.id)
      .map(({ name, amount, staffId, staffName }) => ({ name, amount, staffId, staffName })),
  }));
}
