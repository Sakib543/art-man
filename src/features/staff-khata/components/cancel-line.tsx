"use client";

import { useState } from "react";
import { Field } from "@/components/field";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { num } from "@/lib/format";
import { cancelKhataLineAction } from "../actions";

/**
 * The Owner cancels overtime or a deduction that went in wrong (backlog P3.18).
 * A line of the opposite sign goes in under it; the first stays in the khata.
 */
export function CancelLine({ entryId, label, amount }: { entryId: string; label: string; amount: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  function close() {
    setOpen(false);
    setReason("");
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen(true)} aria-label={`Cancel ${label}`}>
        Cancel
      </Button>

      <FormDialog
        open={open}
        title="Cancel this line?"
        description={`${label}: ${amount > 0 ? "+" : ""}${num(amount)}. A line of ${amount > 0 ? "-" : "+"}${num(Math.abs(amount))} goes in under it, and both stay in the khata.`}
        submitLabel="Cancel the line"
        cancelLabel="Keep it"
        onClose={close}
        onSubmit={() => cancelKhataLineAction({ entryId, reason })}
      >
        <Field label="Why is it cancelled?" htmlFor={`cancel-reason-${entryId}`}>
          <Input
            id={`cancel-reason-${entryId}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-10"
            placeholder="Entered for the wrong karigar"
            autoFocus
          />
        </Field>
      </FormDialog>
    </>
  );
}
