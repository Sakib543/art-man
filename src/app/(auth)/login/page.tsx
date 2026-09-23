import { redirect } from "next/navigation";
import { SalonLogo } from "@/components/salon-logo";
import { Panel } from "@/components/panel";
import { LoginForm } from "@/features/account/components/login-form";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Sign in | Art Men's Salon" };

/**
 * The first screen anyone sees, so it carries the brand rather than being a
 * bare form on grey (P6.1): a navy panel on the left on a wide screen, the
 * card alone on a phone.
 */
export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/billing");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* The navy half. Hidden on a phone, where it would only push the form
          below the fold. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-brass/12 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-20 size-96 rounded-full bg-brass/8 blur-3xl"
        />

        <div aria-hidden />

        <div className="relative max-w-md">
          {/* Above the sentence, not off in the corner — the client's
              instruction, 2026-09-23. */}
          <SalonLogo onDark priority className="mb-8 h-24" />
          <h2 className="text-3xl leading-tight font-semibold text-balance text-sidebar-active-foreground">
            The counter, the drawer and the books — in one place.
          </h2>
          <p className="mt-4 text-md text-pretty text-sidebar-foreground">
            Ring up a bill, settle the cash at the end of the day, and let the month&apos;s accounts add
            themselves up.
          </p>
        </div>

        <p className="relative text-sm text-sidebar-heading">Art Men&apos;s Salon · Karachi</p>
      </div>

      {/* The form half. */}
      <div className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-7 flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            {/* The logo carries the salon's name itself, so the heading that
                repeated it is gone. On a wide screen the navy half already
                shows it, so this one only appears on a phone. */}
            <SalonLogo priority className="h-16 lg:hidden" />
            <p className="text-muted-foreground">Sign in to the counter</p>
          </div>

          {/* Lifted further than a panel inside the app: this card is the
              only thing on the page, so it may carry more weight. */}
          <Panel className="p-6 shadow-md">
            <LoginForm />
          </Panel>

          {/*
            It used to say "ask the Owner". The Owner cannot reset anyone's
            password since 2026-09-23, so that was advice to a closed door. It
            does not name who can, because the Owner and the Manager are not
            shown that the developer role exists.
          */}
          <p className="mt-5 text-center text-xs text-muted-foreground lg:text-left">
            Forgotten your password? It has to be set for you — ask whoever looks after the system.
          </p>
        </div>
      </div>
    </main>
  );
}
