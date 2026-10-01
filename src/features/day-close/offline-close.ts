import type { DayBill } from "@/db/queries/day-bills";
import type { DayEntry } from "@/db/queries/day-entries";
import {
  cashDifference,
  dayPayOf,
  expectedCashBreakdown,
  summarizeDay,
  workByStaff,
  type Bill,
  type FolderEntry,
  type Rupees,
} from "@/lib/accounting";
import { rs } from "@/lib/format";
import { closeCopyOf, knownIds, type DayCopy } from "@/lib/offline/day";
import {
  ENTRY_VERSION,
  isBillItem,
  isFolderItem,
  outboxTally,
  type KindCounts,
  type OutboxCloseEntry,
  type OutboxEntry,
  type OutboxFolderEntry,
  type OutboxItem,
} from "@/lib/offline/outbox";
import type { CloseReview, CloseStaffRow } from "./types";

/**
 * Day Close with no server (backlog P2.2f): the day as this computer knows it,
 * worked out by the same pure functions the server's close uses
 * (`summarizeDay`, `workByStaff`), and the close the outbox keeps for the
 * server. Pure — the screens read the copies and the outbox, this only works
 * the figures out.
 *
 * The day is the server's part — the copy of the day (P2.2e), with the
 * opening cash, pay and khata balances it holds since P2.2f — plus everything
 * of that day still on this computer: bills and entries waiting to be sent,
 * and those the server refused. A refused one is counted too: its money was
 * taken at the counter and is in the drawer, and it is meant to be put right
 * and saved, not dropped. The close waits in the outbox until every one of
 * them has been sent or dealt with (`heldBack`), and the server closes the day
 * only if its books then come to the same expected cash.
 */

/** The day, ready to be closed here. */
export interface LocalDay {
  businessDate: string;
  openingCash: Rupees;
  bills: Bill[];
  entries: FolderEntry[];
  /** As the five steps list them: who works today, their pay, their work and khata balance. */
  staff: CloseStaffRow[];
  /** What of the day is only on this computer, and counted here. */
  onThisComputer: { waiting: KindCounts; refused: KindCounts };
  /** When the server's part was read, ISO: "as of". */
  servedAt: string;
}

export type LocalDayResult = { ok: true; day: LocalDay } | { ok: false; reason: string };

const NO_COPY =
  "This computer has no copy of the day's figures, so the day cannot be closed offline. Count the drawer, write the count down, and close the day when the internet is back.";

const OLD_COPY =
  "This computer's copy of the day was made before offline closing existed, so the day cannot be closed offline. It is replaced by itself while the internet is on. For now, count the drawer, write the count down, and close the day when the internet is back.";

/** A saved bill, as the accounting functions read it. */
const billOfDay = (bill: DayBill): Bill => ({
  cash: bill.cash,
  online: bill.online,
  lines: bill.lines.map(({ staffId, amount }) => ({ staffId, amount })),
});

/**
 * A bill still on this computer. Its lines are kept as the counter sent them,
 * and what each came to beside them in the same order (`pendingBillsOf` in
 * `features/worksheet` reads them the same way).
 */
const billOfOutbox = (entry: OutboxEntry): Bill => ({
  cash: entry.bill.cash,
  online: entry.bill.online,
  lines: entry.bill.lines.map((line, index) => ({ staffId: line.staffId, amount: entry.preview.lines[index]?.amount ?? 0 })),
});

const entryOfDay = ({ kind, amount, paidFrom }: DayEntry): FolderEntry => ({ kind, amount, paidFrom });

const entryOfOutbox = ({ entry }: OutboxFolderEntry): FolderEntry =>
  entry.kind === "expense"
    ? { kind: "expense", amount: entry.amount, paidFrom: entry.paidFrom }
    : { kind: "staff_advance", amount: entry.amount, paidFrom: null };

/**
 * The day to close, from the copy of it and the outbox — or why it cannot be
 * closed here. `copy` must be the copy of `businessDate` (`dayFor`).
 */
export function localDayOf(copy: DayCopy | null, items: readonly OutboxItem[], businessDate: string): LocalDayResult {
  if (!copy || copy.businessDate !== businessDate) return { ok: false, reason: NO_COPY };
  const close = closeCopyOf(copy);
  if (!close) return { ok: false, reason: OLD_COPY };

  // Everything of the day still on this computer, waiting or refused — less
  // what the server already lists (a send whose answer was lost).
  const knownBills = knownIds(copy.bills);
  const knownEntries = knownIds(copy.entries);
  const localBills = items.filter(
    (item): item is OutboxEntry => isBillItem(item) && item.businessDate === businessDate && !knownBills.has(item.clientId),
  );
  const localEntries = items.filter(
    (item): item is OutboxFolderEntry =>
      isFolderItem(item) && item.businessDate === businessDate && !knownEntries.has(item.clientId),
  );

  const bills = [...copy.bills.map(billOfDay), ...localBills.map(billOfOutbox)];
  const entries = [...copy.entries.map(entryOfDay), ...localEntries.map(entryOfOutbox)];

  // An advance comes off the khata when it is saved; one still here has not yet.
  const advances: Record<string, Rupees> = {};
  for (const { entry } of localEntries) {
    if (entry.kind === "staff_advance") advances[entry.staffId] = (advances[entry.staffId] ?? 0) + entry.amount;
  }

  const work = workByStaff(bills);
  // The server's rule (`loadDay`): the active staff, and anyone switched off
  // who still has work on the day.
  const staff = copy.staff
    .filter((member) => (member.active || work[member.id] !== undefined) && close.pay[member.id])
    .map<CloseStaffRow>((member) => ({
      id: member.id,
      name: member.name,
      // By name: a copy kept before P7.13 still has a salary beside them.
      ...dayPayOf(close.pay[member.id]),
      work: work[member.id] ?? 0,
      khataBalance: (close.khata[member.id] ?? 0) - (advances[member.id] ?? 0),
    }));

  return {
    ok: true,
    day: {
      businessDate,
      openingCash: close.openingCash,
      bills,
      entries,
      staff,
      onThisComputer: outboxTally([...localBills, ...localEntries]),
      servedAt: copy.servedAt,
    },
  };
}

export interface CloseCount {
  attendance: Record<string, boolean>;
  payouts: Record<string, Rupees>;
  counted: Rupees;
}

/**
 * Expected cash against the count, worked out here — what `reviewClose` gives
 * online, from the same `summarizeDay` on the same kind of figures.
 */
export function reviewLocally(day: LocalDay, { attendance, payouts, counted }: CloseCount): CloseReview {
  const summary = summarizeDay({
    openingCash: day.openingCash,
    bills: day.bills,
    entries: day.entries,
    staff: day.staff.map((member) => ({ id: member.id, pay: dayPayOf(member), present: attendance[member.id] ?? true })),
    payouts,
  });
  return {
    expected: summary.expectedCash,
    counted,
    difference: counted - summary.expectedCash,
    breakdown: expectedCashBreakdown(day.openingCash, summary),
    onlineSales: summary.online,
  };
}

/**
 * Expected cash below zero: more is recorded as leaving the drawer than it
 * ever held, which no count can match (P7.5, QA-29). It used to read as a huge
 * "Extra" with the reason optional, and close — an Rs 11,101,110 payment typed
 * by mistake among them. The server refuses such a close in these words.
 */
export function drawerBelowZero(expected: Rupees): string {
  return `Expected cash comes to ${rs(expected)}: more is recorded as leaving the drawer than it held. Check the payments to staff and today's Daily folders, then count again.`;
}

/** What the server would refuse in a close before it gets it, in its own words — or null. */
export function closeProblem(review: CloseReview, reason: string): string | null {
  if (review.expected < 0) return drawerBelowZero(review.expected);
  if (cashDifference(review.counted, review.expected).reasonRequired && !reason.trim()) {
    return "Write a reason for the shortage before closing.";
  }
  if (reason.trim().length > 300) return "Keep the reason to 300 characters";
  return null;
}

export interface CloseParts extends CloseCount {
  clientId: string;
  /** The day it closes: the only one the server will close with it. */
  businessDate: string;
  madeBy: string;
  /** Now, as an ISO string. */
  madeAt: string;
  reason: string;
  /** What the count was compared with. */
  review: CloseReview;
  staffNames: Record<string, string>;
}

/** A close made on this computer, as the outbox keeps it. */
export function closeEntryOf(parts: CloseParts): OutboxCloseEntry {
  // Only who was paid: a nought for everyone else says nothing, and a staff
  // member switched off on the server meanwhile would get the close refused.
  const payouts = Object.fromEntries(Object.entries(parts.payouts).filter(([, amount]) => amount > 0));
  return {
    v: ENTRY_VERSION,
    type: "close",
    clientId: parts.clientId,
    businessDate: parts.businessDate,
    madeAt: parts.madeAt,
    madeBy: parts.madeBy,
    close: {
      attendance: parts.attendance,
      payouts,
      counted: parts.counted,
      reason: parts.reason.trim() || null,
      expected: parts.review.expected,
    },
    preview: {
      breakdown: parts.review.breakdown,
      onlineSales: parts.review.onlineSales,
      payouts: Object.entries(payouts).map(([id, amount]) => ({ name: parts.staffNames[id] ?? "", amount })),
    },
    rejected: null,
  };
}

/** A close's difference, counted minus expected: negative is short. */
export const differenceOf = (close: OutboxCloseEntry["close"]): Rupees => close.counted - close.expected;
