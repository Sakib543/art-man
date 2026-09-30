"use client";

import { Panel } from "@/components/panel";
import { AlertTriangle, RotateCw, WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { databaseAnswers } from "@/lib/connectivity";
import { failureWords, loadFailureOf } from "@/lib/load-failure";
import { offlinePageFor } from "@/lib/offline/pages";
import { useConnectivity } from "./use-connectivity";

interface ErrorCardProps {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders what failed. In Next 16 the prop is `retry`, not `reset`. */
  retry: () => void;
}

/**
 * What the counter sees when a screen fails to load.
 *
 * It says what it knows, and nothing it does not (backlog P7.11, QA-30): no
 * internet (the connectivity probe), the server up but its database not
 * answering (`/api/health`, asked once per failure), or otherwise a fault in
 * this screen — never "the database" for a bug, which is what it used to say
 * every time. Only the first two send the counter to offline billing and the
 * paper bill book (`lib/load-failure.ts`).
 *
 * It follows the rule the login form settled on (backlog P0.1): a system fault
 * must never read as something the person did, and support must be left with
 * something to go on. The whole error object goes to the browser console; the
 * screen shows the digest that matches the server log.
 */
export function ErrorCard({ error, retry }: ErrorCardProps) {
  const online = useConnectivity();
  const offlinePage = offlinePageFor(usePathname());
  // What the health route said about *this* error: a new one is asked about afresh.
  const [checked, setChecked] = useState<{ error: Error; database: boolean | null } | null>(null);

  useEffect(() => {
    // The message is redacted in production, so the console is where a
    // developer looks first. Keep it even though the screen stays general.
    console.error(error);

    let current = true;
    void databaseAnswers(fetch).then((database) => {
      if (current) setChecked({ error, database });
    });
    return () => {
      current = false;
    };
  }, [error]);

  const failure = loadFailureOf(online, checked?.error === error ? checked.database : null);
  const words = failureWords(failure);
  const Icon = failure === "offline" ? WifiOff : AlertTriangle;

  return (
    <Panel>
      <div className="flex items-start gap-3 px-card py-4">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-danger-soft text-destructive">
          <Icon className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0" role="alert">
          <h2 className="text-md font-semibold">{words.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{words.cause}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{words.advice}</p>
          {words.offerOffline ? (
            // A plain link, not a client navigation: the offline page is a
            // page of its own, and the service worker has to be the one to open it.
            <a href={offlinePage.href} className="mt-2 inline-block text-sm font-medium underline underline-offset-2">
              Open {offlinePage.view === "billing" ? "offline billing" : `${offlinePage.label} offline`}
            </a>
          ) : null}
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
