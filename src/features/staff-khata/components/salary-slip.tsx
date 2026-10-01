"use client";

import { AlertCircle, FileDown } from "lucide-react";
import { useState } from "react";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { MonthChoice } from "@/db/queries/months";

/**
 * Download one staff member's salary slip for a month, as a PDF (backlog
 * P3.3). Nothing is sent anywhere: the file is theirs to keep, print or pass
 * on — the client's choice.
 *
 * Fetched rather than linked, so that a refusal ("sign in again", "no
 * internet") is said on the screen instead of being saved as a broken file.
 */
export function SalarySlip({
  staffId,
  staffName,
  months,
  shownMonth,
}: {
  staffId: string;
  staffName: string;
  months: MonthChoice[];
  /** The month the khata shows (P7.15): its slip is the one offered, once the month is closed. */
  shownMonth: string | null;
}) {
  // The last closed month is the one whose slip is final: the one handed over at month end.
  const initial =
    months.find((choice) => choice.month === shownMonth && choice.closed)?.month ??
    months.find((choice) => choice.closed)?.month ??
    months[0]?.month ??
    "";
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const chosen = months.find((choice) => choice.month === month);

  if (months.length === 0) return null;

  async function download() {
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/staff-slip?staff=${encodeURIComponent(staffId)}&month=${encodeURIComponent(month)}`, {
        cache: "no-store",
        // With no session cookie the proxy redirects to the login page; that is "sign in", not a slip.
        redirect: "manual",
      });
      if (response.type === "opaqueredirect" || response.status === 401) return setError("Sign in again to download the slip.");
      if (!response.ok || !response.headers.get("Content-Type")?.includes("application/pdf")) {
        return setError((await response.text()) || "The slip could not be made. Try again.");
      }

      const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? `salary-slip-${month}.pdf`;
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.append(link);
      link.click();
      link.remove();
      // Let the browser start saving before the file is let go.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setOpen(false);
    } catch {
      setError("No connection. The slip is made on the server: try again when the internet is back.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-9"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <FileDown className="size-4" aria-hidden />
        Salary slip
      </Button>

      <Dialog open={open} onOpenChange={(next) => !next && setOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Salary slip for {staffName}</DialogTitle>
            <DialogDescription>
              A PDF of the month&apos;s account: commission, wage, salary and bonus, what was paid and taken, and what is
              left — in totals and day by day, with room to sign.
            </DialogDescription>
          </DialogHeader>

          <Field
            label="Month"
            htmlFor="slip-month"
            hint={
              chosen?.closed
                ? "Final: the month is closed, so these figures will not change."
                : "Provisional: this month is still open, so the figures may change."
            }
          >
            <NativeSelect id="slip-month" className="w-full" value={month} onChange={(event) => setMonth(event.target.value)}>
              {months.map((choice) => (
                <NativeSelectOption key={choice.month} value={choice.month}>
                  {choice.label}
                  {choice.closed ? " (final)" : " (provisional)"}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          {error ? (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={download} disabled={busy || !month}>
              <FileDown aria-hidden />
              {busy ? "Making the slip..." : "Download PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
