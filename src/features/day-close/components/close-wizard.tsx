"use client";

import { unstable_isUnrecognizedActionError, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { requestCatalogRefresh } from "@/components/catalog-sync";
import { requestDayRefresh } from "@/components/day-sync";
import { useConnectivity } from "@/components/use-connectivity";
import { dayEarning, type DayEarning } from "@/lib/accounting";
import type { ActionResult } from "@/lib/action-result";
import { parseRupees } from "@/lib/format";
import { dayFor } from "@/lib/offline/day";
import { describeCounts, outboxTally, workOfDay, type OutboxCloseEntry } from "@/lib/offline/outbox";
import { offlineTrust, trustRefusal } from "@/lib/offline/session";
import { queueClose, readCatalog, readDay, readOutbox, removeFromOutbox } from "@/lib/offline/store";
import { closeDayAction, reviewCloseAction } from "../actions";
import { closeEntryOf, closeProblem, localDayOf, reviewLocally, type CloseCount, type LocalDay } from "../offline-close";
import { checkPayouts, overOwedText } from "../payments";
import type { CloseReview, CloseStaffRow } from "../types";
import { restoreWizard, wizardKey, type WizardState } from "../wizard-state";
import { CountStep, ReviewStep } from "./count-steps";
import { AttendanceStep, EarningsStep, PaymentsStep } from "./staff-steps";
import { Stepper } from "./stepper";

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

interface WizardProps {
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
}

/** Nothing to subscribe to: the kept answers are read once, when the wizard mounts. */
const noSubscription = () => () => {};

function readKept(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null; // Storage blocked: the close starts over, as it always did.
  }
}

function forget(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Nothing kept, then.
  }
}

/**
 * Day Close, picking up where a reload left it (P7.5, QA-31): the answers so
 * far are kept in this tab's `sessionStorage`, one entry per business day.
 * The server has no storage, so the wizard is drawn once the page is running
 * in the browser — the server's render and the first one here both see
 * "not read yet", and they agree. A refused offline close (`start`) opens from
 * what it was, never from what was kept.
 */
export function CloseWizard(props: WizardProps) {
  const key = wizardKey(props.businessDate);
  const raw = useSyncExternalStore(noSubscription, () => readKept(key), () => undefined);
  if (raw === undefined) return null;
  const kept = props.start ? null : restoreWizard(raw, props.staff.map((row) => row.id));
  return <Wizard {...props} storageKey={key} kept={kept} />;
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
function Wizard({
  staff,
  businessDate,
  local,
  start,
  storageKey,
  kept,
}: WizardProps & { storageKey: string; kept: WizardState | null }) {
  const router = useRouter();
  const online = useConnectivity();
  // Step 3 needs its payments pre-filled first; kept answers always have them by then.
  const [step, setStep] = useState(() => (kept && (kept.step < 3 || kept.payouts) ? kept.step : kept ? 2 : 1));
  // The close's id (P2.2f): the same until the day is known to be closed — across
  // a reload too (P7.5). A refused close closed again keeps its own.
  const [clientId] = useState(() => start?.clientId ?? kept?.clientId ?? crypto.randomUUID());
  const [present, setPresent] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(staff.map((s) => [s.id, start?.close.attendance[s.id] ?? kept?.present[s.id] ?? true])),
  );
  // null until step 3 opens, then pre-filled with what daily-wage staff earned.
  const [payouts, setPayouts] = useState<Record<string, string> | null>(() =>
    start ? Object.fromEntries(staff.map((s) => [s.id, String(start.close.payouts[s.id] ?? 0)])) : (kept?.payouts ?? null),
  );
  const [counted, setCounted] = useState(start ? String(start.close.counted) : (kept?.counted ?? ""));
  const [reviewed, setReviewed] = useState<Reviewed | null>(null);
  const [reason, setReason] = useState(start?.close.reason ?? kept?.reason ?? "");
  // The payments someone was asked about and said yes to (P7.5): pressing Continue
  // again with the same figures goes on; any change asks again.
  const [confirmedPayouts, setConfirmedPayouts] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // Every answer kept as it is given, so a reload carries on from here (P7.5).
  useEffect(() => {
    const state: WizardState = { v: 1, clientId, step, present, payouts, counted, reason };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage blocked or full: a reload starts over, as it did before.
    }
  }, [storageKey, clientId, step, present, payouts, counted, reason]);

  const earnings = useMemo(() => {
    const result: Record<string, DayEarning> = {};
    for (const row of staff) {
      result[row.id] = dayEarning(row, row.work, present[row.id] ?? true);
    }
    return result;
  }, [staff, present]);

  const go = (next: number) => {
    setError("");
    setStep(next);
  };

  const payoutsCheck = () => checkPayouts(staff, earnings, payouts ?? {});

  /** Step 3 done: every payment whole rupees, and anyone paid more than they are owed asked about once. */
  function paymentsDone() {
    setError("");
    const check = payoutsCheck();
    if (!check.ok) return setError(check.problem);
    const figures = JSON.stringify(check.amounts);
    if (check.overOwed.length > 0 && confirmedPayouts !== figures) {
      setConfirmedPayouts(figures);
      return setError(overOwedText(check.overOwed));
    }
    go(4);
  }

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
    const cash = parseRupees(counted);
    if (cash === null) return setError("Enter the cash counted in whole rupees, e.g. 12500.");
    const payments = payoutsCheck();
    if (!payments.ok) return setError(payments.problem);
    const count = { attendance: present, payouts: payments.amounts, counted: cash };
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
  async function keep(review: CloseReview, count: CloseCount) {
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
          ...count,
          reason,
          review,
          staffNames: Object.fromEntries(staff.map((row) => [row.id, row.name])),
        }),
      );
      forget(storageKey);
    } catch (thrown) {
      console.error(thrown);
      setError("This computer could not keep the close. Write the count down and close the day when the internet is back.");
    }
  }

  /** The server has closed the day. */
  function afterClose() {
    forget(storageKey);
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
    // Exactly what was compared with the count: every payment was checked
    // there, and the count is the review's own.
    const payments = payoutsCheck();
    if (!payments.ok) return setError(payments.problem);
    const count = { attendance: present, payouts: payments.amounts, counted: review.counted };

    startTransition(async () => {
      if (here !== null) return keep(review, count);

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
        result = await closeDayAction({ ...count, reason, clientId });
      } catch (thrown) {
        if (unstable_isUnrecognizedActionError(thrown)) return setError(OUTDATED);
        // The connection dropped. The close may or may not have reached the
        // server; kept under the same id, it closes the day exactly once.
        return keep(review, count);
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
          onNext={paymentsDone}
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
