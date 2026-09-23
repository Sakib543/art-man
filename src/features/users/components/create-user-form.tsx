"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import { FormFeedback } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useFormAction } from "@/components/use-form-action";
import { checkNewPassword } from "@/lib/auth/password-rules";
import type { Role } from "@/lib/auth/roles";
import { createUserAction } from "../actions";
import { ROLE_TEXT } from "./role-text";

/**
 * The password is typed here and shown on screen while it is typed, because
 * whoever creates the account has to read it out to the new person. It cannot
 * be recovered afterwards — the same bargain `pnpm db:seed` makes when it
 * prints a password once.
 */
export function CreateUserForm({ creatable }: { creatable: Role[] }) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>(creatable.includes("manager") ? "manager" : creatable[0]);
  const [password, setPassword] = useState("");
  const { error, done, pending, run, fail } = useFormAction();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) return fail("Write the person's name.");
    const problem = checkNewPassword(password);
    if (problem) return fail(problem);

    run(
      () => createUserAction({ username, name, role, password }),
      `Account created. Give ${username.trim().toLowerCase()} their password now — it cannot be shown again.`,
      () => {
        setUsername("");
        setName("");
        setPassword("");
      },
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3.5 sm:grid-cols-2" noValidate>
      <Field label="Username" htmlFor="new-username" hint="What they type to sign in. Lowercase, no spaces.">
        <Input
          id="new-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>

      <Field label="Name" htmlFor="new-name" hint="Shown in the sidebar and in the audit log.">
        <Input id="new-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" className="h-10" />
      </Field>

      <Field label="Role" htmlFor="new-role" hint={ROLE_TEXT[role]}>
        <NativeSelect
          id="new-role"
          className="w-full"
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
        >
          {creatable.map((option) => (
            <option key={option} value={option}>
              {option === "owner" ? "Owner" : option === "manager" ? "Manager" : "Developer"}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label="First password" htmlFor="new-password" hint="Read it out to them. It cannot be shown again.">
        <Input
          id="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="h-10 font-mono"
        />
      </Field>

      <div className="sm:col-span-2">
        <FormFeedback error={error} done={done} />
        <Button type="submit" className="mt-2" disabled={pending}>
          {pending ? "Creating..." : "Create account"}
        </Button>
      </div>
    </form>
  );
}
