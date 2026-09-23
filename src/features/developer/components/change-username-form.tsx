"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import { FormFeedback } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormAction } from "@/components/use-form-action";
import { changeUsernameAction } from "../actions";
import { checkUsername } from "../username-rules";

/**
 * Rename the developer's own account. Only this account can be renamed, and
 * only by itself — the Owner's and the Manager's usernames belong to the
 * salon.
 */
export function ChangeUsernameForm({ current }: { current: string }) {
  const [next, setNext] = useState(current);
  const { error, done, pending, run, fail } = useFormAction();

  function submit(event: FormEvent) {
    event.preventDefault();
    const problem = checkUsername(next, current);
    if (problem) return fail(problem);

    run(
      () => changeUsernameAction({ username: next }),
      `You sign in as ${next.trim()} from now on. This session stays open.`,
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3.5" noValidate>
      <Field
        label="Username"
        htmlFor="dev-username"
        hint="Letters, numbers, a dot, an underscore or a hyphen. Capitals are ignored when you sign in."
      >
        <Input
          id="dev-username"
          autoComplete="username"
          spellCheck={false}
          autoCapitalize="none"
          value={next}
          onChange={(event) => setNext(event.target.value)}
        />
      </Field>
      <FormFeedback error={error} done={done} />
      <Button type="submit" variant="outline" disabled={pending || next.trim() === current}>
        {pending ? "Saving..." : "Change username"}
      </Button>
    </form>
  );
}
