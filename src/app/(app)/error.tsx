"use client";

import { ErrorCard } from "@/components/error-card";
import { PageHeader } from "@/components/page-header";

/**
 * A signed-in screen that failed. This boundary sits inside `(app)/layout.tsx`,
 * so the sidebar stays on screen and the counter can move to another screen
 * instead of being stranded.
 *
 * It does NOT catch a failure in that layout itself — `error.tsx` never wraps
 * the layout beside it. `requireUser()` runs there and touches the database, so
 * that case is real; it is caught one level up, by `src/app/error.tsx`.
 */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <>
      <PageHeader title="Something went wrong" />
      <ErrorCard error={error} retry={retry} />
    </>
  );
}
