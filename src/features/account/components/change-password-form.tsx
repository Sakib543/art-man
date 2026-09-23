"use client";

import { PasswordInput } from "@/components/password-input";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import { FormFeedback } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/components/use-form-action";
import { checkNewPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password-rules";
import { changePasswordAction } from "../actions";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const { error, done, pending, run, fail } = useFormAction();

  function submit(event: FormEvent) {
    event.preventDefault();
    const problem = checkNewPassword(next, current);
    if (problem) return fail(problem);
    if (next !== again) return fail("The two new passwords do not match.");

    run(() => changePasswordAction({ currentPassword: current, newPassword: next }), "Password changed. Other devices have been signed out.", () => {
      setCurrent("");
      setNext("");
      setAgain("");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3.5" noValidate>
      <Field label="Current password" htmlFor="pw-current">
        <PasswordInput id="pw-current" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="h-10" />
      </Field>
      <Field label="New password" htmlFor="pw-new" hint={`At least ${MIN_PASSWORD_LENGTH} characters, with letters as well as numbers.`}>
        <PasswordInput id="pw-new" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className="h-10" />
      </Field>
      <Field label="New password again" htmlFor="pw-again">
        <PasswordInput id="pw-again" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className="h-10" />
      </Field>
      <FormFeedback error={error} done={done} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Change password"}
      </Button>
    </form>
  );
}
