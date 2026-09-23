"use client";

import { PasswordInput } from "@/components/password-input";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import { FormFeedback } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { useFormAction } from "@/components/use-form-action";
import { checkNewPassword } from "@/lib/auth/password-rules";
import { resetPasswordAction } from "../actions";

interface ResetPasswordFormProps {
  userId: string;
  username: string;
  /** This is the developer's own account: the wording and the outcome differ. */
  self?: boolean;
}

/**
 * Set one account's password. The person is signed out on every device —
 * except, when the developer is resetting themselves, the session they are
 * doing it from. Being signed out by your own click would leave you at the
 * login screen holding a password you had not written down yet.
 */
export function ResetPasswordForm({ userId, username, self = false }: ResetPasswordFormProps) {
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
      self
        ? "Your password is changed. You are still signed in here; every other device is signed out."
        : `${username} has a new password and has been signed out everywhere.`,
      () => {
        setNext("");
        setAgain("");
      },
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3.5" noValidate>
      <Field label="New password" htmlFor={`pw-${userId}`}>
        <PasswordInput id={`pw-${userId}`} autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </Field>
      <Field label="New password again" htmlFor={`pw2-${userId}`}>
        <PasswordInput id={`pw2-${userId}`} autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
        />
      </Field>
      {self ? (
        <p className="text-sm text-muted-foreground">
          This is your own account. You stay signed in here; your other devices are signed out. Write
          the new password down before you leave this screen — nobody can read it back for you.
        </p>
      ) : null}
      <FormFeedback error={error} done={done} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : self ? "Set my password" : "Set password"}
      </Button>
    </form>
  );
}
