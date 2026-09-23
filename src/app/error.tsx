"use client";

import { ErrorCard } from "@/components/error-card";
import { SalonLogo } from "@/components/salon-logo";

/**
 * The outer boundary: everything below the root layout, including
 * `(app)/layout.tsx` and the login page. When it is the app shell that failed
 * there is no sidebar to show, so this stands on its own — the same shape as
 * the login and maintenance screens.
 */
export default function AppRootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md">
        {/* The logo already says the salon's name, so the heading that used
            to repeat it underneath is gone. */}
        <SalonLogo className="mx-auto mb-6 h-14" />
        <ErrorCard error={error} retry={retry} />
      </div>
    </main>
  );
}
