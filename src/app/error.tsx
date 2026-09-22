"use client";

import { Scissors } from "lucide-react";
import { ErrorCard } from "@/components/error-card";

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
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-primary text-[#e6c58f]">
            <Scissors className="size-6" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold">Art Men&apos;s Salon</h1>
        </div>
        <ErrorCard error={error} retry={retry} />
      </div>
    </main>
  );
}
