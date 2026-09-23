"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth/client";

/** `onDark` is the navy sidebar and the bar across the top of a phone. */
export function SignOutButton({ onDark = false }: { onDark?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      aria-label="Sign out"
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-lg transition-colors focus-visible:outline-none disabled:opacity-50",
        onDark
          ? "text-sidebar-heading hover:bg-sidebar-hover hover:text-sidebar-active-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <LogOut className="size-4.5" aria-hidden />
    </button>
  );
}
