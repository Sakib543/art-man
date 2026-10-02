"use client";

import { Clock } from "lucide-react";
import { useState } from "react";
import { Field } from "@/components/field";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSaveId } from "@/components/use-save-id";
import { formatHours, hasHourDecimals, overtimePay, type Rupees } from "@/lib/accounting";
import { rs } from "@/lib/format";
import { addOvertimeAction } from "../actions";

/**
 * Overtime for a karigar (backlog P3.18), by the Owner or the Manager: hours at
 * their own rate, set on Staff & rates. The rupees shown here are what the
 * server will work out; it never takes them from the screen.
 */
export function AddOvertime({ staffId, staffName, rate }: { staffId: string; staffName: string; rate: Rupees }) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  // The same until the overtime is saved or the dialog is closed (P7.2).
  const [saveId, nextSaveId] = useSaveId();

  const typed = Number(hours);
  const valid = hours.trim() !== "" && typed > 0 && hasHourDecimals(typed);

  function close() {
    setOpen(false);
    setHours("");
    setReason("");
    nextSaveId();
  }

  return (
    <>
      <Button variant="outline" className="h-9" onClick={() => setOpen(true)}>
        <Clock className="size-4" aria-hidden />
        Overtime
      </Button>

      <FormDialog
        open={open}
        title={`Overtime for ${staffName}`}
        description={
          rate > 0
            ? `At ${rs(rate)} an hour. It is added to the khata straight away; handing the money over is a staff payment, like any other.`
            : `No overtime rate is set for ${staffName}. The Owner sets it on Staff & rates.`
        }
        submitLabel="Add overtime"
        onClose={close}
        savesOnce
        onSubmit={async () => {
          if (rate <= 0) return { ok: false, error: `Set ${staffName}'s overtime rate on Staff & rates first.` };
          return addOvertimeAction({ staffId, hours: hours.trim() === "" ? null : typed, reason, clientId: saveId });
        }}
      >
        <Field
          label="Hours"
          htmlFor="overtime-hours"
          hint={valid && rate > 0 ? `${formatHours(typed)} × ${rs(rate)} = ${rs(overtimePay(typed, rate))}` : "Half an hour is 0.5"}
        >
          <Input
            id="overtime-hours"
            type="number"
            min={0.25}
            max={24}
            step={0.25}
            inputMode="decimal"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            className="h-10 tabular-nums"
            autoFocus
          />
        </Field>

        <Field label="What was it for?" htmlFor="overtime-reason" hint="It goes in the khata line and in the audit log.">
          <Input
            id="overtime-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-10"
            placeholder="Stayed late for a wedding party"
          />
        </Field>
      </FormDialog>
    </>
  );
}
