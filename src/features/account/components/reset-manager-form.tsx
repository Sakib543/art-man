"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkNewPassword } from "@/lib/auth/password-rules";
import { resetManagerPasswordAction } from "../actions";
import { FormFeedback } from "./form-feedback";
import { useFormAction } from "./use-form-action";

export function ResetManagerForm() {
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const { error, done, pending, run, fail } = useFormAction();

  function submit(event: FormEvent) {
    event.preventDefault();
    const problem = checkNewPassword(next);
    if (problem) return fail(problem);
    if (next !== again) return fail("The two passwords do not match.");

    run(() => resetManagerPasswordAction({ newPassword: next }), "The Manager's password has been changed and they have been signed out.", () => {
      setNext("");
      setAgain("");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3.5" noValidate>
      <Field label="New password for the Manager" htmlFor="mgr-new">
        <Input id="mgr-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className="h-10" />
      </Field>
      <Field label="New password again" htmlFor="mgr-again">
        <Input id="mgr-again" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className="h-10" />
      </Field>
      <FormFeedback error={error} done={done} />
      <Button type="submit" className="h-10" disabled={pending}>
        {pending ? "Saving..." : "Set Manager's password"}
      </Button>
    </form>
  );
}
