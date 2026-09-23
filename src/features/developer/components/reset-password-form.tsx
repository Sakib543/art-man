"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import { FormFeedback } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/components/use-form-action";
import { checkNewPassword } from "@/lib/auth/password-rules";
import { resetPasswordAction } from "../actions";

/** Set one account's password. The person is signed out on every device. */
export function ResetPasswordForm({ userId, username }: { userId: string; username: string }) {
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const { error, done, pending, run, fail } = useFormAction();

  function submit(event: FormEvent) {
    event.preventDefault();
    const problem = checkNewPassword(next);
    if (problem) return fail(problem);
    if (next !== again) return fail("The two passwords do not match.");

    run(
      () => resetPasswordAction({ userId, newPassword: next }),
      `${username} has a new password and has been signed out everywhere.`,
      () => {
        setNext("");
        setAgain("");
      },
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3.5" noValidate>
      <Field label="New password" htmlFor={`pw-${userId}`}>
        <Input
          id={`pw-${userId}`}
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="h-10"
        />
      </Field>
      <Field label="New password again" htmlFor={`pw2-${userId}`}>
        <Input
          id={`pw2-${userId}`}
          type="password"
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          className="h-10"
        />
      </Field>
      <FormFeedback error={error} done={done} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Set password"}
      </Button>
    </form>
  );
}
