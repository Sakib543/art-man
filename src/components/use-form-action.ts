"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";

/**
 * The saving / error / done state every settings form shares. `run` calls the
 * action and reports whether it worked, so the form can clear its fields.
 */
export function useFormAction() {
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult<unknown>>, successMessage: string, onSuccess?: () => void) {
    setError("");
    setDone("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return setError(result.error);
      setDone(successMessage);
      onSuccess?.();
    });
  }

  return { error, done, pending, run, fail: setError };
}
