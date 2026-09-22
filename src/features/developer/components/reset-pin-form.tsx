"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import { FormFeedback } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/components/use-form-action";
import { isValidPin } from "@/lib/pin";
import { resetPinAction } from "../actions";

/**
 * Set the Owner's 4-digit PIN. A PIN cannot be read back — resetting it is the
 * only way to recover a forgotten one, so tell the Owner the new number.
 */
export function ResetPinForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const { error, done, pending, run, fail } = useFormAction();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!isValidPin(pin)) return fail("The PIN must be exactly 4 digits.");

    run(() => resetPinAction({ userId, newPin: pin }), "The Owner's PIN has been changed.", () => {
      setPin("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3.5" noValidate>
      <Field label="New PIN" htmlFor={`pin-${userId}`} hint="Four digits. Tell the Owner what you set.">
        <Input
          id={`pin-${userId}`}
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="h-10 w-28 font-mono tracking-[0.3em]"
        />
      </Field>
      <FormFeedback error={error} done={done} />
      <Button type="submit" className="h-10" disabled={pending}>
        {pending ? "Saving..." : "Set PIN"}
      </Button>
    </form>
  );
}
