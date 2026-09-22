import { asc, desc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { billLines, bills, cashEntries, daySnapshots } from "@/db/schema";
import { computeSecurityCode, FIRST_DAY_CODE } from "@/lib/security-code";

/** Anything that can run selects: the db itself or a transaction. */
type Reader = Pick<typeof db, "select">;

/** The headline figures a day's security code covers. */
export type DayFigures = Record<
  | "sale"
  | "cash"
  | "online"
  | "expenses"
  | "staffEarned"
  | "staffPaid"
  | "dayProfit"
  | "openingCash"
  | "expectedCash"
  | "countedCash"
  | "difference",
  number
>;

/**
 * Work out a day's security code from the database: the day's figures, its
 * bills and entries as they are now, and the previous day's code. Closing a
 * day and re-checking it later both use this, so they always agree.
 */
export async function computeDayCode(reader: Reader, businessDate: string, figures: DayFigures): Promise<string> {
  const [previous] = await reader
    .select({ code: daySnapshots.securityCode })
    .from(daySnapshots)
    .where(lt(daySnapshots.businessDate, businessDate))
    .orderBy(desc(daySnapshots.businessDate))
    .limit(1);

  const billRows = await reader.select().from(bills).where(eq(bills.businessDate, businessDate)).orderBy(asc(bills.billNo));
  const lineRows = await reader
    .select({ billId: billLines.billId, name: billLines.name, amount: billLines.amount, staffId: billLines.staffId })
    .from(billLines)
    .innerJoin(bills, eq(billLines.billId, bills.id))
    .where(eq(bills.businessDate, businessDate));
  const entryRows = await reader
    .select({
      kind: cashEntries.kind,
      amount: cashEntries.amount,
      paidFrom: cashEntries.paidFrom,
      staffId: cashEntries.staffId,
      description: cashEntries.description,
      voidsEntryId: cashEntries.voidsEntryId,
    })
    .from(cashEntries)
    .where(eq(cashEntries.businessDate, businessDate))
    .orderBy(asc(cashEntries.createdAt), asc(cashEntries.id));

  return computeSecurityCode({
    previousCode: previous?.code ?? FIRST_DAY_CODE,
    businessDate,
    figures,
    bills: billRows.map((bill) => ({
      billNo: bill.billNo,
      cash: bill.cash,
      online: bill.online,
      customerId: bill.customerId,
      reversesBillId: bill.reversesBillId,
      lines: lineRows.filter((line) => line.billId === bill.id).map(({ name, amount, staffId }) => ({ name, amount, staffId })),
    })),
    entries: entryRows,
  });
}

/** Re-check a closed day: does its stored code still match its data? A mismatch means something changed. */
export async function verifyDayCode(businessDate: string): Promise<{ ok: boolean; stored: string; recomputed: string }> {
  const [snapshot] = await db.select().from(daySnapshots).where(eq(daySnapshots.businessDate, businessDate)).limit(1);
  if (!snapshot) throw new Error(`No closing record for ${businessDate}`);

  const recomputed = await computeDayCode(db, businessDate, {
    sale: snapshot.sale,
    cash: snapshot.cash,
    online: snapshot.online,
    expenses: snapshot.expenses,
    staffEarned: snapshot.staffEarned,
    staffPaid: snapshot.staffPaid,
    dayProfit: snapshot.dayProfit,
    openingCash: snapshot.openingCash,
    expectedCash: snapshot.expectedCash,
    countedCash: snapshot.countedCash,
    difference: snapshot.difference,
  });
  return { ok: recomputed === snapshot.securityCode, stored: snapshot.securityCode, recomputed };
}
