"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { openFirstDayAction } from "../actions";

/** Owner only: open the very first business day and enter the drawer's opening cash. */
export function OpenFirstDay({ today }: { today: string }) {
  const router = useRouter();
  const [businessDate, setBusinessDate] = useState(today);
  const [openingCash, setOpeningCash] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await openFirstDayAction({ businessDate, openingCash: Number(openingCash) || 0 });
      if (!result.ok) return setError(result.error);
      router.push("/billing");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4 rounded-[14px] border bg-card p-[18px]" noValidate>
      <div>
        <h2 className="text-[15px] font-semibold">Open the first business day</h2>
        <p className="text-[13px] text-muted-foreground">
          After this, each day opens automatically when the previous one is closed, with the cash left in the drawer.
        </p>
      </div>
      <Field label="Business day" htmlFor="first-day-date">
        <Input id="first-day-date" type="date" value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} className="h-10" />
      </Field>
      <Field label="Opening cash in the drawer (Rs)" htmlFor="first-day-cash">
        <Input
          id="first-day-cash"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={openingCash}
          onChange={(e) => setOpeningCash(e.target.value)}
          className="h-10 tabular-nums"
        />
      </Field>
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-[12.5px] text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-10" disabled={pending}>
        {pending ? "Opening..." : "Open business day"}
      </Button>
    </form>
  );
}
