import type { ReactNode } from "react";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { Sidebar } from "@/components/app-shell/sidebar";
import { requireUser } from "@/lib/auth/session";

/**
 * Shell for every signed-in screen. It needs the user for the sidebar; each
 * page still does its own role check next to its data (layouts do not re-run
 * on client navigation).
 *
 * Two navigations, not one responsive one (P6.1): the navy `Sidebar` from `lg`
 * up, and `MobileNav` — a top bar, a drawer and a bottom bar — below it. They
 * are different shapes, and the single element that tried to be both turned
 * into a horizontal scroller holding all nineteen links.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="grid min-h-screen lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <Sidebar user={user} />
      <MobileNav user={{ name: user.name, role: user.role }} />

      {/*
        `pb-28` clears the bottom bar on a phone. On `lg` the bar is gone and
        the padding comes back to something ordinary.
      */}
      <main className="min-w-0 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pb-12 print:px-0 print:pt-0">
        <div className="mx-auto w-full max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
