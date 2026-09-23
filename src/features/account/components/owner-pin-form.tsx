"use client";

import { PasswordInput } from "@/components/password-input";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import { FormFeedback } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/components/use-form-action";
import { isValidPin } from "@/lib/pin";
import { changePinAction } from "../actions";

export function OwnerPinForm() {
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const { error, done, pending, run, fail } = useFormAction();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!isValidPin(pin)) return fail("The PIN must be exactly 4 digits.");
    if (pin !== again) return fail("The two PINs do not match.");

    run(() => changePinAction({ password, newPin: pin }), "Your PIN has been changed.", () => {
      setPassword("");
      setPin("");
      setAgain("");
    });
  }

  const digits = (value: string) => value.replace(/\D/g, "").slice(0, 4);

  return (
    <form onSubmit={submit} className="space-y-3.5" noValidate>
      <Field label="Your account password" htmlFor="pin-password" hint="Confirms that it is really you changing the PIN.">
        <PasswordInput id="pin-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="New PIN (4 digits)" htmlFor="pin-new">
          <PasswordInput id="pin-new" inputMode="numeric" maxLength={4} autoComplete="off" value={pin} onChange={(e) => setPin(digits(e.target.value))} className="h-10 tracking-widest" />
        </Field>
        <Field label="New PIN again" htmlFor="pin-again">
          <PasswordInput id="pin-again" inputMode="numeric" maxLength={4} autoComplete="off" value={again} onChange={(e) => setAgain(digits(e.target.value))} className="h-10 tracking-widest" />
        </Field>
      </div>
      <FormFeedback error={error} done={done} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Change PIN"}
      </Button>
    </form>
  );
}
