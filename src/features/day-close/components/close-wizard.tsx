"use client";

import { unstable_isUnrecognizedActionError, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { requestCatalogRefresh } from "@/components/catalog-sync";
import { requestDayRefresh } from "@/components/day-sync";
import { useConnectivity } from "@/components/use-connectivity";
import { dayEarning, type DayEarning } from "@/lib/accounting";
import type { ActionResult } from "@/lib/action-result";
import { dayFor } from "@/lib/offline/day";
import { describeCounts, outboxTally, workOfDay, type OutboxCloseEntry } from "@/lib/offline/outbox";
import { offlineTrust, trustRefusal } from "@/lib/offline/session";
import { queueClose, readCatalog, readDay, readOutbox, removeFromOutbox } from "@/lib/offline/store";
import { closeDayAction, reviewCloseAction } from "../actions";
import { closeEntryOf, closeProblem, localDayOf, reviewLocally, type CloseCount, type LocalDay } from "../offline-close";
import type { CloseReview, CloseStaffRow } from "../types";
import { CountStep, ReviewStep } from "./count-steps";
import { AttendanceStep, EarningsStep, PaymentsStep } from "./staff-steps";
import { Stepper } from "./stepper";

const toRupees = (text: string | undefined) => Math.max(0, Math.trunc(Number(text) || 0));

const OUTDATED = "The app was updated while this screen was open, so the day was not closed. Reload the page (F5) and try again.";

/** The day as this computer knows it, from its copies and the outbox (P2.2f). */
async function readLocalDay(businessDate: string) {
  const [day, items] = await Promise.all([readDay().catch(() => null), readOutbox().catch(() => [])]);
  return localDayOf(dayFor(day, businessDate), items, businessDate);
}

/** A review, and — when it was worked out on this computer — as of when (P2.2f). */
interface Reviewed {
  review: CloseReview;
  /** The copy's "as of" when this computer worked it out; null when the server did. */
  here: string | null;
}

/**
 * The five Day Close steps. Steps 1 to 3 only collect what the manager tells
 * us; the server works out expected cash and does the closing itself.
 *
 * Since P2.2f the same steps close a day with no server. On the offline page
 * (`local`), and on the full screen when the connection goes before the count
 * is compared, expected cash is worked out on this computer from its copy of
 * the day (`reviewLocally`, the server's own `summarizeDay`) and the close is
 * kept in the outbox; the server makes the security code when it arrives, and
 * closes the day only if its books come to the same expected cash. A close
 * sent from the full screen whose answer is lost is kept the same way, under
 * the same id — so it closes the day exactly once, whichever copy arrives.
 */
export function CloseWizard({
  staff,
  businessDate,
  local,
  start,
}: {
  staff: CloseStaffRow[];
  /** The day being closed. */
  businessDate: string;
  /** The offline page (P2.2f): the day as this computer knows it. Nothing is asked of the server. */
  local?: LocalDay;
  /**
   * A close made on this computer that the server refused (P2.2f), to close
   * the day again from: its id, and what was entered then.
   */
  start?: OutboxCloseEntry | null;
}) {
  const router = useRouter();
  const online = useConnectivity();
  const [step, setStep] = useState(1);
  // The close's id (P2.2f): the same until the day is known to be closed. A
  // refused close closed again keeps its own.
  const [clientId] = useState(() => start?.clientId ?? crypto.randomUUID());
  const [present, setPresent] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(staff.map((s) => [s.id, start?.close.attendance[s.id] ?? true])),
  );
  // null until step 3 opens, then pre-filled with what daily-wage staff earned.
  const [payouts, setPayouts] = useState<Record<string, string> | null>(() =>
    start ? Object.fromEntries(staff.map((s) => [s.id, String(start.close.payouts[s.id] ?? 0)])) : null,
  );
  const [counted, setCounted] = useState(start ? String(start.close.counted) : "");
  const [reviewed, setReviewed] = useState<Reviewed | null>(null);
  const [reason, setReason] = useState(start?.close.reason ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const earnings = useMemo(() => {
    const result: Record<string, DayEarning> = {};
    for (const row of staff) {
      result[row.id] = dayEarning(
        { payType: row.payType, salary: row.salary, dailyWage: row.dailyWage, commissionRate: row.commissionRate },
        row.work,
        present[row.id] ?? true,
      );
    }
    return result;
  }, [staff, present]);

  const go = (next: number) => {
    setError("");
    setStep(next);
  };

  const payoutAmounts = () => Object.fromEntries(staff.map((row) => [row.id, toRupees(payouts?.[row.id])]));

  function toPayments() {
    // Daily-wage staff usually take their day's earning in hand, so start from that.
    if (payouts === null) {
      setPayouts(Object.fromEntries(staff.map((row) => [row.id, String(row.payType === 3 ? earnings[row.id].total : 0)])));
    }
    go(3);
  }

  /**
   * Expected cash against the count: from the server, or worked out here —
   * on the offline page, or when the server cannot be reached (P2.2f).
   */
  async function reviewOf(count: CloseCount): Promise<ActionResult<Reviewed>> {
    if (!local && online) {
      try {
        const result = await reviewCloseAction(count);
        return result.ok ? { ok: true, data: { review: result.data, here: null } } : result;
      } catch (thrown) {
        if (unstable_isUnrecognizedActionError(thrown)) return { ok: false, error: OUTDATED };
        // The connection went: work it out on this computer instead.
      }
    }
    const day = local ? ({ ok: true, day: local } as const) : await readLocalDay(businessDate);
    if (!day.ok) return { ok: false, error: day.reason };
    return { ok: true, data: { review: reviewLocally(day.day, count), here: day.day.servedAt } };
  }

  function countDone() {
    setError("");
    if (counted.trim() === "") return setError("Enter the total cash counted in the drawer.");
    const count = { attendance: present, payouts: payoutAmounts(), counted: toRupees(counted) };
    startTransition(async () => {
      const result = await reviewOf(count);
      if (!result.ok) return setError(result.error);
      setReviewed(result.data);
      setStep(5);
    });
  }

  /**
   * Keep the close on this computer for the server (P2.2f): into the outbox,
   * behind the day's bills and entries. The screen then shows it as closed
   * here — it reads the outbox. Only within 12 hours of the server last
   * confirming the sign-in, like everything made offline.
   */
  async function keep(review: CloseReview) {
    try {
      const stored = await readCatalog().catch(() => null);
      const trust = offlineTrust(stored?.savedAt ?? null, Date.now());
      if (!trust.ok) return setError(trustRefusal(trust, "close"));
      if (!stored) return setError(trustRefusal({ ok: false, reason: "no-copy" }, "close"));

      await queueClose(
        closeEntryOf({
          clientId,
          businessDate,
          madeBy: stored.user.username,
          madeAt: new Date().toISOString(),
          attendance: present,
          payouts: payoutAmounts(),
          counted: toRupees(counted),
          reason,
          review,
          staffNames: Object.fromEntries(staff.map((row) => [row.id, row.name])),
        }),
      );
    } catch (thrown) {
      console.error(thrown);
      setError("This computer could not keep the close. Write the count down and close the day when the internet is back.");
    }
  }

  /** The server has closed the day. */
  function afterClose() {
    // A refused close made on this computer is done with: the day is closed.
    if (start) removeFromOutbox(start.clientId).catch((thrown) => console.warn("Could not clear the kept close", thrown));
    // Both offline copies carry the open day: they should know at once that
    // there is none now, or offline work would be kept for a closed day (P2.2f).
    requestDayRefresh();
    requestCatalogRefresh();
    router.refresh();
  }

  function closeDay() {
    setError("");
    if (!reviewed) return;
    const { review, here } = reviewed;
    const problem = closeProblem(review, reason);
    if (problem) return setError(problem);

    startTransition(async () => {
      if (here !== null) return keep(review);

      // Sent straight to the server only while nothing of the day is left on
      // this computer: once the server has closed a day, none of it goes in.
      const held = workOfDay(await readOutbox().catch(() => []), businessDate);
      if (held.length > 0) {
        const { waiting, refused } = outboxTally(held);
        return setError(
          `${describeCounts({ bills: waiting.bills + refused.bills, entries: waiting.entries + refused.entries, closes: 0 })} of this day ${held.length === 1 ? "is" : "are"} still on this computer. Close the day once ${held.length === 1 ? "it has" : "they have"} reached the server.`,
        );
      }

      let result;
      try {
        result = await closeDayAction({
          attendance: present,
          payouts: payoutAmounts(),
          counted: toRupees(counted),
          reason,
          clientId,
        });
      } catch (thrown) {
        if (unstable_isUnrecognizedActionError(thrown)) return setError(OUTDATED);
        // The connection dropped. The close may or may not have reached the
        // server; kept under the same id, it closes the day exactly once.
        return keep(review);
      }
      if (!result.ok) return setError(result.error);
      afterClose();
    });
  }

  return (
    <>
      <Stepper current={step} />

      {step === 1 ? (
        <AttendanceStep
          staff={staff}
          present={present}
          onToggle={(id, value) => setPresent((current) => ({ ...current, [id]: value }))}
          onNext={() => go(2)}
        />
      ) : null}

      {step === 2 ? <EarningsStep staff={staff} earnings={earnings} onBack={() => go(1)} onNext={toPayments} /> : null}

      {step === 3 && payouts ? (
        <PaymentsStep
          staff={staff}
          earnings={earnings}
          payouts={payouts}
          onPayout={(id, value) => setPayouts((current) => ({ ...current, [id]: value }))}
          error={error}
          pending={pending}
          onBack={() => go(2)}
          onNext={() => go(4)}
        />
      ) : null}

      {step === 4 ? (
        <CountStep
          counted={counted}
          onCounted={setCounted}
          error={error}
          pending={pending}
          onBack={() => go(3)}
          onNext={countDone}
        />
      ) : null}

      {step === 5 && reviewed ? (
        <ReviewStep
          review={reviewed.review}
          here={reviewed.here}
          reason={reason}
          onReason={setReason}
          error={error}
          pending={pending}
          onRecount={() => {
            setReviewed(null);
            go(4);
          }}
          onClose={closeDay}
        />
      ) : null}
    </>
  );
}
