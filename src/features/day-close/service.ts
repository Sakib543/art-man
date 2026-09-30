import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { getLatestBusinessDay, getOpenBusinessDay } from "@/db/queries/business-day";
import { attendance, auditLog, businessDays, cashEntries, daySnapshotHistory, daySnapshots, khataEntries } from "@/db/schema";
import { cashDifference, expectedCashBreakdown } from "@/lib/accounting";
import type { SessionUser } from "@/lib/auth/session";
import { nextDate } from "@/lib/business-date";
import { UserError } from "@/lib/errors";
import { formatDate, rs } from "@/lib/format";
import { loadDay } from "@/db/queries/day-data";
import { postEarnings, requireOpenMonth, summarize } from "@/db/day-settlement";
import type { CloseInput, DiscardOfflineCloseInput, OfflineCloseOrigin, ReviewInput, SyncCloseInput } from "./schemas";
import { computeDayCode, type DayFigures } from "@/db/day-code";
import { drawerBelowZero } from "./offline-close";
import type { ClosedDay, CloseReview } from "./types";

const actorOf = (user: SessionUser) => user.username || user.name;

/** Anything that can run selects: the db itself or a transaction. */
type Reader = Pick<typeof db, "select">;

/**
 * The close this id already made, when it made one (P2.2f). Its `day.close`
 * audit entry carries the id, and that entry is append-only: so a close whose
 * answer was lost, sent again, gets that close back — even after the Owner has
 * reopened the day since — and never closes a day a second time.
 */
async function closedEarlier(reader: Reader, clientId: string | null): Promise<ClosedDay | null> {
  if (!clientId) return null;
  // `audit_log_action_target_created_at_idx` narrows it to the day closes.
  const [row] = await reader
    .select({ after: auditLog.after })
    .from(auditLog)
    .where(and(eq(auditLog.action, "day.close"), sql`${auditLog.after} ->> 'clientId' = ${clientId}`))
    .limit(1);
  if (!row) return null;
  const code = (row.after as { securityCode?: unknown } | null)?.securityCode;
  return { securityCode: typeof code === "string" ? code : "", alreadySaved: true };
}

/** Why a close made offline cannot close the day the server has open now. */
function offlineDayGone(madeOn: string, openNow: string | null): string {
  const now = openNow ? ` The open day is ${formatDate(openNow)}.` : "";
  return `${formatDate(madeOn)} has already been closed on the server, so the close made on this computer was not used.${now}`;
}

async function requireOpenDay() {
  const day = await getOpenBusinessDay();
  if (!day) throw new UserError("There is no open business day to close.");
  return day;
}

/** After the cash is counted: expected cash and the difference. */
export async function reviewClose(input: ReviewInput): Promise<CloseReview> {
  const day = await requireOpenDay();
  const loaded = await loadDay(db, day.businessDate);
  const summary = summarize(loaded, day.openingCash, input.attendance, input.payouts);

  return {
    expected: summary.expectedCash,
    counted: input.counted,
    difference: input.counted - summary.expectedCash,
    breakdown: expectedCashBreakdown(day.openingCash, summary),
    onlineSales: summary.online,
  };
}

/**
 * Close the day in one transaction: attendance, staff earnings into the khata,
 * payments made now, the day's snapshot with its security code, then lock.
 * If anything fails, none of it is saved.
 *
 * Once per `clientId` (P2.2f): a close sent again gets the one it made.
 *
 * `offline` is set when the counter closed the day with no server and the
 * outbox sent the close later. It closes the day it was made on or nothing,
 * and only if the server works out the same expected cash the count was
 * compared with. The counted cash is a fact of that moment; if the day's
 * books have moved since — a bill refused and removed, something done from
 * another device — the difference and its reason no longer describe them, so
 * the close is refused and the day is closed again on the screen. Everything
 * else — earnings, the snapshot, the security code — the server works out from
 * its own books, as it always does; nothing the browser worked out is trusted.
 */
export async function closeDay(user: SessionUser, input: CloseInput, offline?: OfflineCloseOrigin): Promise<ClosedDay> {
  const earlier = await closedEarlier(db, input.clientId);
  if (earlier) return earlier;

  const day = await getOpenBusinessDay();
  if (offline && day?.businessDate !== offline.businessDate) {
    throw new UserError(offlineDayGone(offline.businessDate, day?.businessDate ?? null));
  }
  if (!day) throw new UserError("There is no open business day to close.");
  const actor = actorOf(user);
  const payouts = input.payouts;

  return db.transaction(async (tx) => {
    // Claiming the day first stops a second close from running at the same time.
    const claimed = await tx
      .update(businessDays)
      .set({ closedAt: new Date() })
      .where(and(eq(businessDays.businessDate, day.businessDate), isNull(businessDays.closedAt)))
      .returning({ businessDate: businessDays.businessDate });
    if (claimed.length === 0) {
      // Two sends of one close at the same instant: the other one closed it,
      // and has committed by now — the claim above waited for it.
      const other = await closedEarlier(tx, input.clientId);
      if (other) return other;
      throw new UserError(offline ? offlineDayGone(offline.businessDate, null) : "This day has already been closed.");
    }

    const loaded = await loadDay(tx, day.businessDate);
    const summary = summarize(loaded, day.openingCash, input.attendance, payouts);

    if (offline && summary.expectedCash !== offline.expected) {
      throw new UserError(
        `The day's cash changed after it was closed on this computer: the count was compared with an expected ${rs(offline.expected)}, and the server's books now expect ${rs(summary.expectedCash)}. Close the day again on the Day close screen.`,
      );
    }

    // Nothing can be counted against a drawer that holds less than nothing (P7.5).
    if (summary.expectedCash < 0) throw new UserError(drawerBelowZero(summary.expectedCash));

    const { difference, reasonRequired } = cashDifference(input.counted, summary.expectedCash);
    const reason = input.reason?.trim() || null;
    if (reasonRequired && !reason) throw new UserError("Write a reason for the shortage before closing.");

    // 1. The day's staff list: attendance, and the pay the day is settled on,
    //    so a correction to it later is settled on the same (P7.3). Skipped
    //    with nobody on it: an insert of no rows throws.
    if (loaded.staff.length > 0) await tx.insert(attendance).values(
      loaded.staff.map((member) => ({
        businessDate: day.businessDate,
        staffId: member.id,
        present: input.attendance[member.id] ?? true,
        payType: member.pay.payType,
        salary: member.pay.salary,
        dailyWage: member.pay.dailyWage,
        commissionRate: member.pay.commissionRate,
      })),
    );

    // 2. What each staff member earned today goes into their khata.
    await postEarnings(tx, day.businessDate, loaded, summary);

    // 3. Payments handed over now.
    for (const member of loaded.staff) {
      const paid = payouts[member.id] ?? 0;
      if (paid <= 0) continue;
      const [entry] = await tx
        .insert(cashEntries)
        .values({
          businessDate: day.businessDate,
          kind: "staff_payment",
          amount: paid,
          description: `Payment to ${member.name}`,
          staffId: member.id,
          createdBy: actor,
        })
        .returning({ id: cashEntries.id });
      await tx.insert(khataEntries).values({
        staffId: member.id,
        businessDate: day.businessDate,
        kind: "payment",
        label: "Payment",
        amount: -paid,
        cashEntryId: entry.id,
      });
    }

    // 4. The snapshot and its security code. The code covers the day's bills and
    //    entries as they stand now, so a later change to any of them shows up.
    const figures: DayFigures = {
      sale: summary.sale,
      cash: summary.cash,
      online: summary.online,
      expenses: summary.expenses,
      staffEarned: summary.staffEarned,
      staffPaid: summary.staffPaid,
      dayProfit: summary.dayProfit,
      openingCash: day.openingCash,
      expectedCash: summary.expectedCash,
      countedCash: input.counted,
      difference,
    };

    const securityCode = await computeDayCode(tx, day.businessDate, figures);

    await tx.insert(daySnapshots).values({
      businessDate: day.businessDate,
      ...figures,
      diffReason: reason,
      securityCode,
      closedBy: actor,
    });

    await writeAudit(tx, {
      actor,
      action: "day.close",
      target: day.businessDate,
      after: {
        ...figures,
        securityCode,
        // What makes a close sent again answerable with this one (P2.2f).
        ...(input.clientId ? { clientId: input.clientId } : {}),
        // Closed with no server (P2.2f): when and by whom, as the browser
        // tells it. The close's own time is when it reached the server.
        ...(offline ? { offline: { madeAt: offline.madeAt, madeBy: offline.madeBy } } : {}),
      },
    });

    return { securityCode, alreadySaved: false };
  });
}

/** How much of what the browser sent a refusal keeps, at most. */
const REFUSAL_RECORD_LIMIT = 20_000;

/**
 * A close made offline that the server refused goes to the audit log
 * (P2.2f), as a refused bill or entry does: the drawer was counted and staff
 * may have been paid, so the server keeps a note of it even though the books
 * do not have it. The close it may later become shares its id.
 */
export async function recordOfflineCloseRefusal(user: SessionUser, clientId: string | null, reason: string, sent: unknown) {
  const text = JSON.stringify(sent) ?? "";
  await writeAudit(db, {
    actor: actorOf(user),
    action: "day.offline-close-refuse",
    target: clientId ? `offline close ${clientId}` : "offline close",
    after: { reason, sent: text.length <= REFUSAL_RECORD_LIMIT ? sent : `(${text.length} characters, not kept)` },
    success: false,
  });
}

/**
 * Close a day the counter closed offline, sent by the outbox (P2.2f) —
 * through `closeDay`, with where it came from. A refusal is recorded before it
 * is passed on.
 */
export async function syncOfflineClose(user: SessionUser, input: SyncCloseInput): Promise<ClosedDay> {
  const { clientId, businessDate, madeAt, madeBy, close } = input;
  try {
    return await closeDay(
      user,
      {
        attendance: close.attendance,
        payouts: close.payouts,
        counted: close.counted,
        reason: close.reason ?? undefined,
        clientId,
      },
      { businessDate, madeAt, madeBy, expected: close.expected },
    );
  } catch (error) {
    if (error instanceof UserError) await recordOfflineCloseRefusal(user, clientId, error.message, input);
    throw error;
  }
}

/**
 * A close made offline that the server refused, taken off the counter's list
 * by a person, with a reason (P2.2f). Nothing reaches the books — the close
 * never did — but it goes to the audit log as the counter kept it, count and
 * all.
 *
 * If a send whose answer was lost had closed the day after all, there is
 * nothing to discard: `saved` says so, and nothing is written. Written once
 * per close, however often it is asked (P2.2c found why).
 */
export async function discardOfflineClose(user: SessionUser, input: DiscardOfflineCloseInput): Promise<{ saved: boolean }> {
  if (await closedEarlier(db, input.clientId)) return { saved: true };

  const action = "day.offline-close-discard";
  const target = `offline close ${input.clientId}`;
  // `audit_log_action_target_created_at_idx` answers this.
  const [already] = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(and(eq(auditLog.action, action), eq(auditLog.target, target)))
    .limit(1);
  if (already) return { saved: false };

  await writeAudit(db, { actor: actorOf(user), action, target, after: { reason: input.reason, close: input.close } });
  return { saved: false };
}

/** Open the day after the last closed one. The drawer's leftover carries over automatically. */
export async function startNextDay(user: SessionUser): Promise<void> {
  const latest = await getLatestBusinessDay();
  if (!latest) throw new UserError("No business day has been opened yet.");
  if (!latest.closedAt) throw new UserError("Close today before starting the next business day.");

  const [snapshot] = await db.select().from(daySnapshots).where(eq(daySnapshots.businessDate, latest.businessDate)).limit(1);
  if (!snapshot) throw new UserError("The last day has no closing record.");

  const next = nextDate(latest.businessDate);
  await db.transaction(async (tx) => {
    await tx.insert(businessDays).values({ businessDate: next, openingCash: snapshot.countedCash });
    await writeAudit(tx, {
      actor: actorOf(user),
      action: "day.open",
      target: next,
      after: { openingCash: snapshot.countedCash },
    });
  });
}

/** The Owner opens the very first business day and enters its opening cash. */
export async function openFirstDay(user: SessionUser, businessDate: string, openingCash: number): Promise<void> {
  if (await getLatestBusinessDay()) throw new UserError("A business day already exists.");

  await db.transaction(async (tx) => {
    await tx.insert(businessDays).values({ businessDate, openingCash });
    await writeAudit(tx, { actor: actorOf(user), action: "day.open", target: businessDate, after: { openingCash } });
  });
}

/**
 * The Owner reopens the day that was just closed, so a mistake made at close can
 * be put right. Everything the close wrote is undone the way this system always
 * undoes things: the closing record is archived before it is replaced, and the
 * khata and cash rows are reversed with new rows rather than deleted.
 *
 * Only the latest business day can be reopened, and only before the next day is
 * started. A later day's opening cash is this day's count and its security code
 * is built on this one's, so reopening underneath it would quietly break both.
 */
export async function reopenDay(user: SessionUser, reason: string): Promise<void> {
  const latest = await getLatestBusinessDay();
  if (!latest) throw new UserError("No business day has been opened yet.");
  if (!latest.closedAt) throw new UserError("This day is already open.");

  await requireOpenMonth(latest.businessDate);

  const date = latest.businessDate;
  const actor = actorOf(user);

  await db.transaction(async (tx) => {
    // Claiming the day first stops two reopens from running at the same time.
    const claimed = await tx
      .update(businessDays)
      .set({ closedAt: null })
      .where(and(eq(businessDays.businessDate, date), isNotNull(businessDays.closedAt)))
      .returning({ businessDate: businessDays.businessDate });
    if (claimed.length === 0) throw new UserError("This day has already been reopened.");

    const [snapshot] = await tx.select().from(daySnapshots).where(eq(daySnapshots.businessDate, date)).limit(1);
    if (!snapshot) throw new UserError("This day has no closing record to undo.");

    // 1. Keep the closing record, with its security code, before replacing it.
    await tx.insert(daySnapshotHistory).values({
      businessDate: snapshot.businessDate,
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
      diffReason: snapshot.diffReason,
      securityCode: snapshot.securityCode,
      closedBy: snapshot.closedBy,
      closedAt: snapshot.createdAt,
      reopenReason: reason,
      reopenedBy: actor,
    });

    // 2. Reverse the khata lines the close wrote. Earnings and payments are only
    //    ever written by a close, and a line an earlier reopen already reversed
    //    is left alone so a second reopen cannot subtract it twice.
    const dayLines = await tx.select().from(khataEntries).where(eq(khataEntries.businessDate, date));
    const reversed = new Set(dayLines.flatMap((line) => (line.reversesEntryId ? [line.reversesEntryId] : [])));

    for (const line of dayLines) {
      if (line.kind !== "earning" && line.kind !== "payment") continue;
      if (reversed.has(line.id)) continue;
      await tx.insert(khataEntries).values({
        staffId: line.staffId,
        businessDate: date,
        kind: "adjustment",
        label: `Day reopened: reversal of "${line.label}"`,
        amount: -line.amount,
        reversesEntryId: line.id,
      });
    }

    // 3. Cancel the cash handed to staff at close, exactly as a folder entry is
    //    cancelled: a negative row that points back at the original.
    const dayEntries = await tx.select().from(cashEntries).where(eq(cashEntries.businessDate, date));
    const voided = new Set(dayEntries.flatMap((entry) => (entry.voidsEntryId ? [entry.voidsEntryId] : [])));

    for (const entry of dayEntries) {
      if (entry.kind !== "staff_payment" || entry.voidsEntryId) continue;
      if (voided.has(entry.id)) continue;
      await tx.insert(cashEntries).values({
        businessDate: date,
        kind: "staff_payment",
        amount: -entry.amount,
        description: "Cancelled: day reopened",
        staffId: entry.staffId,
        voidsEntryId: entry.id,
        createdBy: actor,
      });
    }

    // 4. Attendance is marked again at the next close.
    await tx.delete(attendance).where(eq(attendance.businessDate, date));

    // 5. The snapshot itself. Its copy is safe in day_snapshot_history above.
    await tx.delete(daySnapshots).where(eq(daySnapshots.businessDate, date));

    await writeAudit(tx, {
      actor,
      action: "day.reopen",
      target: date,
      before: {
        securityCode: snapshot.securityCode,
        countedCash: snapshot.countedCash,
        expectedCash: snapshot.expectedCash,
        dayProfit: snapshot.dayProfit,
        closedBy: snapshot.closedBy,
      },
      after: { reason },
    });
  });
}
