"use client";

import { CircleMinus } from "lucide-react";
import { useState } from "react";
import { Field } from "@/components/field";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSaveId } from "@/components/use-save-id";
import { addDeductionAction } from "../actions";

/** A deduction from a karigar's khata (backlog P3.18), by the Owner or the Manager, with a reason. */
export function AddDeduction({ staffId, staffName }: { staffId: string; staffName: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  // The same until the deduction is saved or the dialog is closed (P7.2).
  const [saveId, nextSaveId] = useSaveId();

  function close() {
    setOpen(false);
    setAmount("");
    setReason("");
    nextSaveId();
  }

  return (
    <>
      <Button variant="outline" className="h-9" onClick={() => setOpen(true)}>
        <CircleMinus className="size-4" aria-hidden />
        Deduction
      </Button>

      <FormDialog
        open={open}
        title={`Deduction from ${staffName}`}
        description="It is taken off the khata straight away. No cash moves."
        submitLabel="Take it off"
        onClose={close}
        savesOnce
        onSubmit={() => addDeductionAction({ staffId, amount: Number(amount) || 0, reason, clientId: saveId })}
      >
        <Field label="Amount (Rs)" htmlFor="deduction-amount">
          <Input
            id="deduction-amount"
            type="number"
            min={1}
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="h-10 tabular-nums"
            autoFocus
          />
        </Field>

        <Field label="What is it for?" htmlFor="deduction-reason" hint="It goes in the khata line and in the audit log.">
          <Input
            id="deduction-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-10"
            placeholder="Came two hours late"
          />
        </Field>
      </FormDialog>
    </>
  );
}
