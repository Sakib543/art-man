import { and, asc, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { attendance, billCancellations, billLines, bills, cashEntries, daySnapshotHistory, daySnapshots } from "@/db/schema";
import {
  computeSecurityCode,
  FIRST_DAY_CODE,
  securityCodeAsBefore,
  securityCodeBeforeP714,
  type SealedAttendance,
  type SealedBill,
  type SecurityCodeInput,
} from "@/lib/security-code";
import { securityKey } from "@/lib/security-key";

/** Anything that can run selects: the db itself or a transaction. */
type Reader = Pick<typeof db, "select">;
/** Selects and raw SQL: the db itself or a transaction. */
type Executor = Pick<typeof db, "select" | "execute">;

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

interface DayRecords {
  bills: SealedBill[];
  entries: unknown[];
  attendance: SealedAttendance[];
}

/**
 * The bills (with their lines and any cancellation), folder entries and staff
 * list of every day from `from` to `to`, by business date, as the code covers
 * them: five queries however many days. Bills in bill-number order and entries
 * in the order they were made; a bill's lines and the staff list in any order
 * — `computeSecurityCode` puts them in its own (P7.8, P7.14).
 */
async function loadRecords(reader: Reader, from: string, to: string): Promise<Map<string, DayRecords>> {
  const inRange = (column: typeof bills.businessDate | typeof cashEntries.businessDate | typeof attendance.businessDate) =>
    and(gte(column, from), lte(column, to));
  const billRows = await reader.select().from(bills).where(inRange(bills.businessDate)).orderBy(asc(bills.billNo));
  const lineRows = await reader
    .select({ billId: billLines.billId, name: billLines.name, amount: billLines.amount, staffId: billLines.staffId })
    .from(billLines)
    .innerJoin(bills, eq(billLines.billId, bills.id))
    .where(inRange(bills.businessDate));
  const cancelRows = await reader
    .select({ billId: billCancellations.billId, reason: billCancellations.reason })
    .from(billCancellations)
    .innerJoin(bills, eq(billCancellations.billId, bills.id))
    .where(inRange(bills.businessDate));
  const staffRows = await reader
    .select({
      businessDate: attendance.businessDate,
      staffId: attendance.staffId,
      present: attendance.present,
      payType: attendance.payType,
      salary: attendance.salary,
      dailyWage: attendance.dailyWage,
      commissionRate: attendance.commissionRate,
    })
    .from(attendance)
    .where(inRange(attendance.businessDate));
  const entryRows = await reader
    .select({
      businessDate: cashEntries.businessDate,
      kind: cashEntries.kind,
      amount: cashEntries.amount,
      paidFrom: cashEntries.paidFrom,
      staffId: cashEntries.staffId,
      description: cashEntries.description,
      voidsEntryId: cashEntries.voidsEntryId,
    })
    .from(cashEntries)
    .where(inRange(cashEntries.businessDate))
    .orderBy(asc(cashEntries.createdAt), asc(cashEntries.id));

  const cancelReason = new Map(cancelRows.map((row) => [row.billId, row.reason]));
  const days = new Map<string, DayRecords>();
  const dayOf = (date: string) => days.get(date) ?? days.set(date, { bills: [], entries: [], attendance: [] }).get(date)!;
  for (const bill of billRows) {
    dayOf(bill.businessDate).bills.push({
      billNo: bill.billNo,
      cash: bill.cash,
      online: bill.online,
      customerId: bill.customerId,
      reversesBillId: bill.reversesBillId,
      lines: lineRows.filter((line) => line.billId === bill.id).map(({ name, amount, staffId }) => ({ name, amount, staffId })),
      discount: bill.discount,
      discountReason: bill.discountReason,
      bookNo: bill.bookNo,
      cancelReason: cancelReason.get(bill.id) ?? null,
    });
  }
  for (const { businessDate, ...entry } of entryRows) dayOf(businessDate).entries.push(entry);
  for (const { businessDate, ...member } of staffRows) dayOf(businessDate).attendance.push(member);
  return days;
}

const NO_RECORDS: DayRecords = { bills: [], entries: [], attendance: [] };

/**
 * Work out a day's security code from the database: the day's figures and
 * the drawer's reason, its records as they are now, and the previous day's
 * code. Closing a day and settling one again both use this — after the day's
 * staff list is written, which the code covers (P7.14). Sealed with the
 * server's key when it has one (P7.8b), whatever the day's date.
 */
export async function computeDayCode(
  reader: Reader,
  businessDate: string,
  figures: DayFigures,
  diffReason: string | null,
): Promise<string> {
  const [previous] = await reader
    .select({ code: daySnapshots.securityCode })
    .from(daySnapshots)
    .where(lt(daySnapshots.businessDate, businessDate))
    .orderBy(desc(daySnapshots.businessDate))
    .limit(1);
  const records = (await loadRecords(reader, businessDate, businessDate)).get(businessDate) ?? NO_RECORDS;

  return computeSecurityCode(
    { previousCode: previous?.code ?? FIRST_DAY_CODE, businessDate, figures, diffReason, ...records },
    securityKey()?.key ?? null,
  );
}

/** A closed day checked against its records. */
export interface DayCheck {
  businessDate: string;
  /** The code on record for the day — the one the Owner noted, unless the day was corrected since. */
  code: string;
  /**
   * Its records still give the same code — worked out as it is now, or, for a
   * day sealed before P7.14, as it was then (`securityCodeBeforeP714`). From
   * the first day of the server's key on, only with the key (P7.8b).
   */
  ok: boolean;
  /** Its code was sealed with the server's key (P7.8b). */
  keyed: boolean;
}

interface CheckRow extends Record<string, unknown> {
  business_date: string;
  security_code: string;
  chained_on: string | null;
  previous_date: string | null;
  sale: number;
  cash: number;
  online: number;
  expenses: number;
  staff_earned: number;
  staff_paid: number;
  day_profit: number;
  opening_cash: number;
  expected_cash: number;
  counted_cash: number;
  difference: number;
  diff_reason: string | null;
  closed_by: string;
  /** As Postgres writes it, to the microsecond: drizzle leaves a raw query's timestamps as text. */
  created_at: string;
}

/** A closed day as `inspectDays` found it. */
interface Inspected extends DayCheck {
  row: CheckRow;
  figures: DayFigures;
  /** What the code covers, the lines in the order the database gave them. */
  input: SecurityCodeInput;
}

const figuresOf = (row: CheckRow): DayFigures => ({
  sale: row.sale,
  cash: row.cash,
  online: row.online,
  expenses: row.expenses,
  staffEarned: row.staff_earned,
  staffPaid: row.staff_paid,
  dayProfit: row.day_profit,
  openingCash: row.opening_cash,
  expectedCash: row.expected_cash,
  countedCash: row.counted_cash,
  difference: row.difference,
});

/**
 * Every closed day from `from` to `to`, worked out again from its records.
 *
 * Each day is checked against the code it was chained on when it was sealed
 * — the previous day's code as it stood at that moment — not the previous
 * day's code now (P7.8, QA-05). A correction to a closed day seals that day
 * again (its old code goes to `day_snapshot_history`), and the day after it
 * was chained on the old code; checked against the new one it used to fail,
 * though nothing in it had changed. The code as it stood is found from the
 * previous day's versions: its current record and its archived ones, each with
 * when it was made (`created_at`, `closed_at`) and, archived, when it stopped
 * being the one (`reopened_at` — a reopen or a correction). Compared in SQL,
 * to the microsecond.
 *
 * With the server's key (P7.8b, QA-26), a day matches when its code is the
 * keyed one. A plain hash still matches on a day before the key's first day —
 * sealed before there was a key — but not from it on: the server sealed every
 * such day with the key, so a plain code there is one someone worked out
 * again without it, after changing the day.
 */
async function inspectDays(executor: Executor, from: string, to: string): Promise<Inspected[]> {
  const { rows } = await executor.execute<CheckRow>(sql`
    with days as (
      select d.*,
        (select max(b.business_date) from business_days b where b.business_date < d.business_date) as prev
      from day_snapshots d
      where d.business_date between ${from} and ${to}
    )
    select days.business_date::text as business_date, days.security_code, days.prev::text as previous_date,
      days.sale, days.cash, days.online, days.expenses, days.staff_earned, days.staff_paid, days.day_profit,
      days.opening_cash, days.expected_cash, days.counted_cash, days.difference,
      days.diff_reason, days.closed_by, days.created_at,
      (select v.code from (
          select s.security_code as code, s.created_at as since, null::timestamptz as until
            from day_snapshots s where s.business_date = days.prev
          union all
          select h.security_code, h.closed_at, h.reopened_at
            from day_snapshot_history h where h.business_date = days.prev
        ) v
        where v.since <= days.created_at and (v.until is null or v.until > days.created_at)
        order by v.since desc
        limit 1) as chained_on
    from days
    order by days.business_date
  `);
  if (rows.length === 0) return [];

  const key = securityKey();
  const records = await loadRecords(executor, rows[0].business_date, rows[rows.length - 1].business_date);
  const currentCode = new Map(rows.map((row) => [row.business_date, row.security_code]));

  return rows.map((row) => {
    // A previous day with no version on record for that moment — one sealed
    // before the history was kept — is taken as it stands now.
    const previousCode = row.previous_date
      ? (row.chained_on ?? currentCode.get(row.previous_date) ?? FIRST_DAY_CODE)
      : FIRST_DAY_CODE;
    const figures = figuresOf(row);
    const input: SecurityCodeInput = {
      previousCode,
      businessDate: row.business_date,
      figures,
      diffReason: row.diff_reason,
      ...(records.get(row.business_date) ?? NO_RECORDS),
    };
    const keyed = key !== null && computeSecurityCode(input, key.key) === row.security_code;
    // Without the key: a day sealed before P7.14 is checked on what its code
    // covered then; that cannot give the code of a day sealed since, which covered more.
    const plain = !keyed && (computeSecurityCode(input) === row.security_code || securityCodeBeforeP714(input) === row.security_code);
    const ok = keyed || (plain && (key === null || row.business_date < key.since));
    return { businessDate: row.business_date, code: row.security_code, ok, keyed, row, figures, input };
  });
}

/**
 * Check every closed day from `from` to `to` (P7.8): does its code still come
 * out of its records? The Security codes screen shows this, a month at a time.
 */
export async function checkDayCodes(from: string, to: string): Promise<DayCheck[]> {
  return (await inspectDays(db, from, to)).map(({ businessDate, code, ok, keyed }) => ({ businessDate, code, ok, keyed }));
}

/** Re-check one closed day: does its stored code still match its records? */
export async function verifyDayCode(businessDate: string): Promise<DayCheck | null> {
  const [check] = await checkDayCodes(businessDate, businessDate);
  return check ?? null;
}

/** A day `resealOldDays` looked at and did not pass. */
export interface ResealResult {
  businessDate: string;
  before: string;
  /** The new code; null when the day was left alone, its records having changed. */
  after: string | null;
}

/** Why a day was sealed again, in `day_snapshot_history`. */
export const RESEAL_REASON = "Sealed again: a bill's lines are now covered in a fixed order (P7.8)";

/**
 * Seal again, once, the closed days sealed before P7.8 whose code only fails
 * because of the order their lines came back in (P7.8, QA-27). Inside the
 * caller's transaction.
 *
 * A day is sealed again only when its records still give its code the old way
 * — lines in the order the database gives them now — so nothing that changed
 * after it was sealed is waved through: such a day is left failing, and said.
 * The old code goes to `day_snapshot_history`, as with a correction, and an
 * audit row keeps both. Days in date order, so a day sealed again chains on the
 * one before it as it now stands. A day that passes is not touched.
 */
export async function resealOldDays(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], actor: string): Promise<ResealResult[]> {
  const results: ResealResult[] = [];
  for (const day of await inspectDays(tx, "0001-01-01", "9999-12-31")) {
    if (day.ok) continue;
    if (securityCodeAsBefore(day.input) !== day.code) {
      results.push({ businessDate: day.businessDate, before: day.code, after: null });
      continue;
    }
    const { row, figures } = day;
    await tx.insert(daySnapshotHistory).values({
      businessDate: row.business_date,
      ...figures,
      diffReason: row.diff_reason,
      securityCode: row.security_code,
      closedBy: row.closed_by,
      // Kept to the microsecond: the check finds a version by when it was made.
      closedAt: sql`${row.created_at}::timestamptz`,
      reopenReason: RESEAL_REASON,
      reopenedBy: actor,
    });
    await tx.delete(daySnapshots).where(eq(daySnapshots.businessDate, row.business_date));
    const after = await computeDayCode(tx, row.business_date, figures, row.diff_reason);
    await tx.insert(daySnapshots).values({
      businessDate: row.business_date,
      ...figures,
      diffReason: row.diff_reason,
      securityCode: after,
      closedBy: row.closed_by,
    });
    await writeAudit(tx, { actor, action: "day.reseal", target: row.business_date, before: { securityCode: row.security_code }, after: { securityCode: after, reason: RESEAL_REASON } });
    results.push({ businessDate: row.business_date, before: row.security_code, after });
  }
  return results;
}
