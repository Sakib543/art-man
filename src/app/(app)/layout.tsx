import type { ReactNode } from "react";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { CatalogSync } from "@/components/catalog-sync";
import { DaySync } from "@/components/day-sync";
import { OutboxStatus } from "@/components/outbox-status";
import { OutboxSync } from "@/components/outbox-sync";
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
      {/* The first Tab stop: past the sidebar's links, straight to the screen (P7.17, QA-41). */}
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <CatalogSync />
      {/* The open day's bills and entries, for the offline screens (P2.2e). */}
      <DaySync />
      {/* Bills and folder entries made offline, sent to the server (P2.2c, P2.2e). */}
      <OutboxSync />
      <Sidebar user={user} />
      <MobileNav user={{ name: user.name, role: user.role }} />

      {/*
        `pb-28` clears the bottom bar on a phone. On `lg` the bar is gone and
        the padding comes back to something ordinary.
      */}
      <main id="main" tabIndex={-1} className="min-w-0 px-4 pt-5 pb-28 outline-none sm:px-6 lg:px-8 lg:pb-12 print:px-0 print:pt-0">
        <div className="mx-auto w-full max-w-[1400px]">
          <OutboxStatus />
          {children}
        </div>
      </main>
    </div>
  );
}
