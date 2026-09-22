"use client";

import { Gift } from "lucide-react";
import { useState } from "react";
import { Field } from "@/components/field";
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { giveBonusAction } from "../actions";

/**
 * The Owner gives a bonus (backlog P3.1, spec §10.10). It is shown only to the
 * Owner, because only the Owner may give one.
 */
export function GiveBonus({ staffId, staffName }: { staffId: string; staffName: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  function close() {
    setOpen(false);
    setAmount("");
    setReason("");
  }

  return (
    <>
      <Button variant="outline" className="h-9" onClick={() => setOpen(true)}>
        <Gift className="size-4" aria-hidden />
        Give bonus
      </Button>

      <FormDialog
        open={open}
        title={`Bonus for ${staffName}`}
        description="It is added to the khata straight away. Handing the money over is a staff payment in today's folders, like any other."
        submitLabel="Give bonus"
        onClose={close}
        onSubmit={() => giveBonusAction({ staffId, amount: Number(amount) || 0, reason })}
      >
        <Field label="Amount (Rs)" htmlFor="bonus-amount">
          <Input
            id="bonus-amount"
            type="number"
            min={1}
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="h-10"
            autoFocus
          />
        </Field>

        <Field label="What is it for?" htmlFor="bonus-reason" hint="It goes in the khata line and in the audit log.">
          <Input
            id="bonus-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="h-10"
            placeholder="Eid bonus"
          />
        </Field>
      </FormDialog>
    </>
  );
}
