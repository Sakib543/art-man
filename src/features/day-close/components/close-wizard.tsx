"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dayEarning, type DayEarning } from "@/lib/accounting";
import { closeDayAction, reviewCloseAction, verifyPayoutsAction } from "../actions";
import type { CloseReview, CloseStaffRow } from "../types";
import { CountStep, ReviewStep } from "./count-steps";
import { AttendanceStep, EarningsStep, PaymentsStep } from "./staff-steps";
import { Stepper } from "./stepper";

const toRupees = (text: string | undefined) => Math.max(0, Math.trunc(Number(text) || 0));

/**
 * The five Day Close steps. Steps 1 to 3 only collect what the manager tells
 * us; the server works out expected cash and does the closing itself.
 */
export function CloseWizard({ staff }: { staff: CloseStaffRow[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [present, setPresent] = useState<Record<string, boolean>>(() => Object.fromEntries(staff.map((s) => [s.id, true])));
  // null until step 3 opens, then pre-filled with what daily-wage staff earned.
  const [payouts, setPayouts] = useState<Record<string, string> | null>(null);
  const [pins, setPins] = useState<Record<string, string>>({});
  const [counted, setCounted] = useState("");
  const [review, setReview] = useState<CloseReview | null>(null);
  const [reason, setReason] = useState("");
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
  const payoutsWithPins = () =>
    Object.fromEntries(staff.map((row) => [row.id, { amount: toRupees(payouts?.[row.id]), pin: pins[row.id] ?? "" }]));

  function toPayments() {
    // Daily-wage staff usually take their day's earning in hand, so start from that.
    if (payouts === null) {
      setPayouts(Object.fromEntries(staff.map((row) => [row.id, String(row.payType === 3 ? earnings[row.id].total : 0)])));
    }
    go(3);
  }

  function toCount() {
    setError("");
    startTransition(async () => {
      const result = await verifyPayoutsAction({ payouts: payoutsWithPins() });
      if (!result.ok) return setError(result.error);
      setStep(4);
    });
  }

  function countDone() {
    setError("");
    if (counted.trim() === "") return setError("Enter the total cash counted in the drawer.");
    startTransition(async () => {
      const result = await reviewCloseAction({ attendance: present, payouts: payoutAmounts(), counted: toRupees(counted) });
      if (!result.ok) return setError(result.error);
      setReview(result.data);
      setStep(5);
    });
  }

  function closeDay() {
    setError("");
    startTransition(async () => {
      const result = await closeDayAction({
        attendance: present,
        payouts: payoutsWithPins(),
        counted: toRupees(counted),
        reason,
      });
      if (!result.ok) return setError(result.error);
      router.refresh();
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
          pins={pins}
          onPayout={(id, value) => setPayouts((current) => ({ ...current, [id]: value }))}
          onPin={(id, value) => setPins((current) => ({ ...current, [id]: value }))}
          error={error}
          pending={pending}
          onBack={() => go(2)}
          onNext={toCount}
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

      {step === 5 && review ? (
        <ReviewStep
          review={review}
          reason={reason}
          onReason={setReason}
          error={error}
          pending={pending}
          onRecount={() => {
            setReview(null);
            go(4);
          }}
          onClose={closeDay}
        />
      ) : null}
    </>
  );
}
