import { asc, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { getLatestBusinessDay } from "@/db/queries/business-day";
import { monthAdjustments, monthCloses, staff } from "@/db/schema";
import { adjustmentEffect } from "@/lib/accounting";
import { monthOf, monthStart } from "@/lib/business-date";
import { cancelBlocker, recordBlocker } from "./rules";
import type { AdjustmentRow, AdjustmentsData, StaffChoice } from "./types";

/**
 * The adjustments the Monthly report of `month` shows (backlog P3.4): those
 * that count in it, those recorded later that correct it, and whether one for
 * it can be recorded now.
 */
export async function getAdjustmentsData(month: string): Promise<AdjustmentsData> {
  const start = monthStart(month);

  const [rows, closedRows, latest, staffRows] = await Promise.all([
    db
      .select({
        id: monthAdjustments.id,
        month: monthAdjustments.month,
        correctsMonth: monthAdjustments.correctsMonth,
        kind: monthAdjustments.kind,
        amount: monthAdjustments.amount,
        online: monthAdjustments.online,
        paidFrom: monthAdjustments.paidFrom,
        staffName: staff.name,
        reason: monthAdjustments.reason,
        voidsId: monthAdjustments.voidsId,
        createdBy: monthAdjustments.createdBy,
        createdAt: monthAdjustments.createdAt,
      })
      .from(monthAdjustments)
      .leftJoin(staff, eq(monthAdjustments.staffId, staff.id))
      // A cancellation shares its adjustment's two months, so it comes with it.
      .where(or(eq(monthAdjustments.month, start), eq(monthAdjustments.correctsMonth, start)))
      .orderBy(desc(monthAdjustments.createdAt)),
    db.select({ month: monthCloses.month }).from(monthCloses),
    getLatestBusinessDay(),
    db.select({ id: staff.id, name: staff.name, active: staff.active }).from(staff).orderBy(asc(staff.createdAt), asc(staff.name)),
  ]);

  const closed = new Set(closedRows.map((row) => monthOf(row.month)));
  const cancelled = new Set(rows.flatMap((row) => (row.voidsId ? [row.voidsId] : [])));

  const list: AdjustmentRow[] = rows.map((row) => {
    const effect = adjustmentEffect(row);
    const countsIn = monthOf(row.month);
    const isCancellation = row.voidsId !== null;
    const isCancelled = cancelled.has(row.id);
    return {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy,
      countsIn,
      corrects: monthOf(row.correctsMonth),
      kind: row.kind,
      amount: row.amount,
      online: row.online,
      paidFrom: row.paidFrom,
      staffName: row.staffName,
      reason: row.reason,
      profit: effect.profit,
      khata: effect.khata,
      cancelled: isCancelled,
      isCancellation,
      canCancel:
        cancelBlocker({ isCancellation, cancelled: isCancelled, countsIn, countsInClosed: closed.has(countsIn) }) === null,
    };
  });

  const current = latest ? monthOf(latest.businessDate) : null;
  const blocked = recordBlocker({
    corrects: month,
    correctsClosed: closed.has(month),
    current,
    currentClosed: current !== null && closed.has(current),
  });

  // Somebody who has left may still have pay to put right, so everyone is
  // offered — those still working first.
  const staffChoices: StaffChoice[] = [...staffRows].sort((a, b) => Number(b.active) - Number(a.active));

  return {
    countedHere: list.filter((row) => row.countsIn === month),
    forThisMonth: list.filter((row) => row.corrects === month),
    record: blocked === null && current !== null ? { countsIn: current, staff: staffChoices } : { blocked: blocked ?? "" },
  };
}
