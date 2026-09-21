"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

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
      const { error: signInError } = await authClient.signIn.username({ username, password });
      if (signInError) {
        // Same message for a wrong username or password, so it does not reveal which one exists.
        setError("Wrong username or password.");
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
        <Input id="password" name="password" type="password" autoComplete="current-password" />
      </div>

      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-[12.5px] text-destructive">
          <AlertCircle className="size-4" aria-hidden />
          {error}
        </p>
      ) : null}

      <Button type="submit" className="h-11 w-full text-[15px]" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
