"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth/client";
import { describeCounts, isFolderItem, type KindCounts } from "@/lib/offline/outbox";
import { clearCatalog, readOutbox } from "@/lib/offline/store";

const NOTHING: KindCounts = { bills: 0, entries: 0 };

/** Bills and folder entries in the outbox (P2.2c, P2.2e); none when this browser cannot say. */
async function readUnsent(): Promise<KindCounts> {
  try {
    const items = await readOutbox();
    const entries = items.filter(isFolderItem).length;
    return { bills: items.length - entries, entries };
  } catch {
    return NOTHING;
  }
}

/** `onDark` is the navy sidebar and the bar across the top of a phone. */
export function SignOutButton({ onDark = false }: { onDark?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Bills and entries not yet on the server, when signing out would leave them waiting.
  const [unsent, setUnsent] = useState<KindCounts>(NOTHING);
  const [warning, setWarning] = useState(false);
  const one = unsent.bills + unsent.entries === 1;

  function signOut(anyway = false) {
    startTransition(async () => {
      // Signing out never deletes the outbox (P2.2c) — but what is in it then
      // waits for the next sign-in on this computer, which the counter should
      // know before walking away.
      if (!anyway) {
        const counts = await readUnsent();
        if (counts.bills + counts.entries > 0) {
          setUnsent(counts);
          setWarning(true);
          return;
        }
      }
      setWarning(false);
      await authClient.signOut();
      // The offline copies hold customers' numbers and the day's money, and
      // belong to a signed-in session (P2.2b, P2.2e). The next sign-in fetches
      // fresh ones.
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
              {describeCounts(unsent)} {one ? "has" : "have"} not reached the server yet
            </DialogTitle>
            <DialogDescription>
              Signing out does not delete {one ? "it" : "them"}. {one ? "It stays" : "They stay"} in this browser on
              this computer and {one ? "is" : "are"} sent after the next sign-in here — nowhere else.
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
