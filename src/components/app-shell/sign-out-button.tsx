"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth/client";
import { clearCatalog, readOutbox } from "@/lib/offline/store";

/** Bills in the outbox (P2.2c); none when this browser cannot say. */
async function unsentBills(): Promise<number> {
  try {
    return (await readOutbox()).length;
  } catch {
    return 0;
  }
}

/** `onDark` is the navy sidebar and the bar across the top of a phone. */
export function SignOutButton({ onDark = false }: { onDark?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Bills not yet on the server, when signing out would leave them waiting.
  const [unsent, setUnsent] = useState(0);
  const [warning, setWarning] = useState(false);

  function signOut(anyway = false) {
    startTransition(async () => {
      // Signing out never deletes the outbox (P2.2c) — but its bills then wait
      // for the next sign-in on this computer, which the counter should know
      // before walking away.
      if (!anyway) {
        const count = await unsentBills();
        if (count > 0) {
          setUnsent(count);
          setWarning(true);
          return;
        }
      }
      setWarning(false);
      await authClient.signOut();
      // The offline copy holds customers' numbers and belongs to a signed-in
      // session (P2.2b). The next sign-in fetches a fresh one.
      await clearCatalog().catch(() => undefined);
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => signOut()}
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

      <Dialog open={warning} onOpenChange={(next) => !next && setWarning(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {unsent === 1 ? "1 bill has" : `${unsent} bills have`} not reached the server yet
            </DialogTitle>
            <DialogDescription>
              Signing out does not delete {unsent === 1 ? "it" : "them"}. {unsent === 1 ? "It stays" : "They stay"} in
              this browser on this computer and {unsent === 1 ? "is" : "are"} sent after the next sign-in here —
              nowhere else.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarning(false)}>
              Stay signed in
            </Button>
            <Button onClick={() => signOut(true)} disabled={pending}>
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
