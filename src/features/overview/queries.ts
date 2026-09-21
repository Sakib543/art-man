import { and, count, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { getLatestBusinessDay } from "@/db/queries/business-day";
import { loadDay } from "@/db/queries/day-data";
import { getDayBills } from "@/db/queries/day-bills";
import { auditLog, businessDays, cashEntries, daySnapshots, staff } from "@/db/schema";
import { summarizeDay, type Rupees } from "@/lib/accounting";
import { formatDayMonth } from "@/lib/format";
import { buildAlerts, type Alert } from "./alerts";
import { buildFeed, type FeedItem } from "./feed";

export interface ChartDay {
  businessDate: string;
  /** "21 Sep", or "Today" for the day still open. */
  label: string;
  sale: Rupees;
  isToday: boolean;
}

export interface OverviewData {
  businessDate: string;
  closed: boolean;
  sale: Rupees;
  paidBills: number;
  /** Counted cash once the day is closed, otherwise what the drawer should hold. */
  drawerCash: Rupees;
  drawerCounted: boolean;
  online: Rupees;
  expenses: Rupees;
  chart: ChartDay[];
  alerts: Alert[];
  feed: FeedItem[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 7;

/** The Owner's live view of the latest business day. Null before the first day is opened. */
export async function getOverview(): Promise<OverviewData | null> {
  const day = await getLatestBusinessDay();
  if (!day) return null;
  const closed = day.closedAt !== null;

  const [loaded, dayBills, entryRows, recentDays, [latestClose], [{ wrong }]] = await Promise.all([
    loadDay(db, day.businessDate),
    getDayBills(day.businessDate),
    db
      .select({
        id: cashEntries.id,
        createdAt: cashEntries.createdAt,
        kind: cashEntries.kind,
        amount: cashEntries.amount,
        description: cashEntries.description,
        voidsEntryId: cashEntries.voidsEntryId,
        staffName: staff.name,
      })
      .from(cashEntries)
      .leftJoin(staff, eq(cashEntries.staffId, staff.id))
      .where(eq(cashEntries.businessDate, day.businessDate))
      .orderBy(desc(cashEntries.createdAt))
      .limit(30),
    db.select().from(businessDays).orderBy(desc(businessDays.businessDate)).limit(CHART_DAYS),
    db.select().from(daySnapshots).orderBy(desc(daySnapshots.businessDate)).limit(1),
    db
      .select({ wrong: count() })
      .from(auditLog)
      .where(and(eq(auditLog.action, "pin.wrong"), gt(auditLog.createdAt, new Date(Date.now() - DAY_MS)))),
  ]);

  // Live figures for the day, worked out the same way Day Close does (before any staff payments).
  const summary = summarizeDay({
    openingCash: day.openingCash,
    bills: loaded.bills,
    entries: loaded.entries,
    staff: loaded.staff.map((member) => ({ id: member.id, pay: member.pay, present: true })),
    payouts: {},
  });

  const snapshots = recentDays.length
    ? await db.select().from(daySnapshots).where(inArray(daySnapshots.businessDate, recentDays.map((d) => d.businessDate)))
    : [];
  const saleOf = new Map(snapshots.map((s) => [s.businessDate, s.sale]));

  const chart = [...recentDays].reverse().map<ChartDay>((d) => {
    const isToday = d.closedAt === null;
    return {
      businessDate: d.businessDate,
      label: isToday ? "Today" : formatDayMonth(d.businessDate),
      // A closed day uses its saved figure; the open day is live.
      sale: isToday ? summary.sale : (saleOf.get(d.businessDate) ?? 0),
      isToday,
    };
  });

  const counted = closed ? snapshots.find((s) => s.businessDate === day.businessDate)?.countedCash : undefined;

  return {
    businessDate: day.businessDate,
    closed,
    sale: summary.sale,
    paidBills: dayBills.filter((bill) => bill.status === "active").length,
    drawerCash: counted ?? summary.expectedCash,
    drawerCounted: counted !== undefined,
    online: summary.online,
    expenses: summary.expenses,
    chart,
    alerts: buildAlerts({
      cancelledToday: dayBills.filter((bill) => bill.status === "cancelled").length,
      lastClose: latestClose
        ? { businessDate: latestClose.businessDate, difference: latestClose.difference, reason: latestClose.diffReason }
        : null,
      wrongPins24h: wrong,
    }),
    feed: buildFeed(
      dayBills,
      entryRows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        kind: row.kind,
        amount: row.amount,
        description: row.description,
        staffName: row.staffName,
        isVoid: row.voidsEntryId !== null,
      })),
    ),
  };
}
