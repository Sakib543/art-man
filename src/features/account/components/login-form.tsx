"use client";

import { PasswordInput } from "@/components/password-input";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { signInErrorMessage, type SignInFailure } from "@/lib/auth/sign-in-error";

/**
 * Never throws. A request that does not complete at all comes back as status 0,
 * so the caller has one shape to deal with. The detail goes to the console for
 * whoever is debugging; the screen only ever shows a short sentence.
 */
async function attemptSignIn(username: string, password: string): Promise<SignInFailure | null> {
  try {
    const { error } = await authClient.signIn.username({ username, password });
    if (error) console.error("Sign-in failed:", error);
    return error ?? null;
  } catch (cause) {
    console.error("Sign-in request did not complete:", cause);
    return { status: 0 };
  }
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!username || !password) {
      setError("Enter your username and password.");
      return;
    }

    setError("");
    startTransition(async () => {
      const failure = await attemptSignIn(username, password);
      if (failure) {
        // A wrong password stays vague; a broken server says so. See sign-in-error.ts.
        setError(signInErrorMessage(failure));
        return;
      }
      router.push("/billing");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" autoComplete="username" autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" name="password" autoComplete="current-password" />
      </div>

      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="size-4" aria-hidden />
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
