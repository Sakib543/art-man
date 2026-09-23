import { Scissors } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Page not found | Art Men's Salon" };

/**
 * An address that does not exist. Rare from inside the app — every screen is
 * reached from the sidebar — but a mistyped URL used to land on Next's own
 * black-and-white 404, which looks like the system is broken.
 *
 * Signed-out visitors never see it: the proxy sends anyone without a session
 * cookie to /login first, whatever path they asked for.
 */
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-primary text-brass-bright">
          <Scissors className="size-6" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold">This page does not exist</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Check the address, or go back to the counter.
        </p>
        <Link href="/billing" className={`${buttonVariants()} mt-5`}>
          Go to Billing
        </Link>
      </div>
    </main>
  );
}
