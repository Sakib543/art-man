import { and, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, businessDays } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { closedWhileOfflineText, isDeviceTag, offlineWorkOf, type OfflineDeviceWork } from "@/lib/offline/device";

/**
 * What the computers sent offline, day by day (backlog P7.10, QA-37). The app
 * expects one counter computer (spec §10.5); this is how the Owner is told
 * when there were more. Read from the audit log, where every offline bill,
 * folder entry and close is written as it arrives — saved (`after.offline`)
 * or refused (`after.sent`, the whole request) — with the computer that made
 * it since P7.10. Nothing made before P7.10 names a computer, so it is left out.
 */

const SAVED = ["bill.create", "folder.expense", "folder.staff_advance", "day.close"];
const REFUSED = ["bill.offline-refuse", "folder.offline-refuse", "day.offline-close-refuse"];

const DAY_MS = 24 * 60 * 60 * 1000;

/** The part of an audit row's `after` that says where an offline item came from. */
const origin = sql`coalesce(${auditLog.after} -> 'offline', ${auditLog.after} -> 'sent')`;
const madeOn = sql<string>`${origin} ->> 'businessDate'`;
const deviceId = sql<string>`${origin} -> 'device' ->> 'id'`;

/** For each of `dates`, what each computer sent offline: nothing for a day with no offline work. */
export async function offlineWorkOn(dates: readonly string[]): Promise<Map<string, OfflineDeviceWork[]>> {
  const found = new Map<string, OfflineDeviceWork[]>();
  if (dates.length === 0) return found;

  // Something made offline on a day reaches the server on it or later — and a
  // Karachi day starts five hours before the UTC one; a day's margin covers it.
  // It keeps `audit_log_created_at_idx` in play as the log grows.
  const since = new Date(Date.parse(`${[...dates].sort()[0]}T00:00:00Z`) - DAY_MS);

  const rows = await db
    .select({
      action: auditLog.action,
      businessDate: madeOn,
      deviceId,
      deviceCode: sql<string>`${origin} -> 'device' ->> 'code'`,
      clientId: sql<string | null>`${origin} ->> 'clientId'`,
    })
    .from(auditLog)
    .where(
      and(
        inArray(auditLog.action, [...SAVED, ...REFUSED]),
        gte(auditLog.createdAt, since),
        isNotNull(deviceId),
        inArray(madeOn, [...dates]),
      ),
    );

  for (const date of dates) {
    const work = offlineWorkOf(
      rows
        // A refusal keeps whatever was sent, a malformed tag included; only a real one names a computer.
        .filter((row) => row.businessDate === date && isDeviceTag({ id: row.deviceId, code: row.deviceCode }))
        .map((row) => ({
          deviceId: row.deviceId,
          deviceCode: row.deviceCode,
          clientId: row.clientId,
          saved: SAVED.includes(row.action),
        })),
    );
    if (work.length > 0) found.set(date, work);
  }
  return found;
}

/**
 * Added to the refusal of a bill or an entry made offline that arrives after
 * its day was closed (P7.10, QA-37) — nothing when the day is still open, or
 * was never opened here. Billing and Daily folders both refuse such work.
 */
export async function lateArrivalNote(businessDate: string, what: "bill" | "entry"): Promise<string> {
  const [day] = await db
    .select({ closedAt: businessDays.closedAt })
    .from(businessDays)
    .where(eq(businessDays.businessDate, businessDate))
    .limit(1);
  return day?.closedAt ? closedWhileOfflineText(formatDate(businessDate), what) : "";
}
