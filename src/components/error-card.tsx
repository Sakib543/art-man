"use client";

import { Panel } from "@/components/panel";
import { AlertTriangle, RotateCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ErrorCardProps {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders what failed. In Next 16 the prop is `retry`, not `reset`. */
  retry: () => void;
}

/**
 * What the counter sees when a screen fails to load. In this app that is
 * almost always the database being unreachable, so the wording says so rather
 * than "something went wrong".
 *
 * It follows the rule the login form settled on (backlog P0.1): a system fault
 * must never read as something the person did, and support must be left with
 * something to go on. The whole error object goes to the browser console; the
 * screen shows one sentence and the digest that matches the server log.
 */
export function ErrorCard({ error, retry }: ErrorCardProps) {
  useEffect(() => {
    // The message is redacted in production, so the console is where a
    // developer looks first. Keep it even though the screen stays vague.
    console.error(error);
  }, [error]);

  return (
    <Panel>
      <div className="flex items-start gap-3 px-card py-4">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-danger-soft text-destructive">
          <AlertTriangle className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-md font-semibold">This screen could not be loaded</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The system could not reach the database. This is a fault in the system, not something
            you did, and nothing you have already entered has been lost.
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Try again. If it keeps happening, the internet or the database is down — use the paper
            bill book and enter those bills once this screen goes away.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-surface-sunken px-card py-3">
        {/* Next generates the digest and writes the same value to the server log. */}
        {error.digest ? (
          <span className="font-mono text-xs text-muted-foreground">
            Reference {error.digest}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">No reference was recorded</span>
        )}
        <Button onClick={() => retry()}>
          <RotateCw aria-hidden />
          Try again
        </Button>
      </div>
    </Panel>
  );
}
