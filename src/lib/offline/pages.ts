/**
 * The screens that still work with no internet, and the page each is served
 * from then (backlog P2.2d, P2.2e, P2.2f): static pages outside the signed-in
 * shell, kept by the service worker and filled from this browser's IndexedDB.
 *
 * `public/sw.js` cannot import this file, so it names the same pages and the
 * same stand-ins itself; `pages.test.ts` reads it and fails if the two part.
 *
 * Pure.
 */

export type OfflineView = "billing" | "folders" | "register" | "day-close";

export interface OfflinePage {
  view: OfflineView;
  /** The static page the worker keeps. */
  href: string;
  /** What the tab says. */
  label: string;
  /** The full screen it stands in for, once the internet is back. */
  online: string;
  /** The online paths that open it when there is no network. */
  standsInFor: string[];
}

export const OFFLINE_PAGES: readonly OfflinePage[] = [
  { view: "billing", href: "/offline-billing", label: "Billing", online: "/billing", standsInFor: ["/", "/billing"] },
  { view: "folders", href: "/offline-folders", label: "Daily folders", online: "/folders", standsInFor: ["/folders"] },
  {
    view: "register",
    href: "/offline-register",
    label: "Register",
    online: "/daily-report?view=register",
    // The register is the Daily report's second view (P6.4); `/worksheet` redirects to it.
    standsInFor: ["/daily-report", "/worksheet"],
  },
  { view: "day-close", href: "/offline-day-close", label: "Day close", online: "/day-close", standsInFor: ["/day-close"] },
];

export const offlinePage = (view: OfflineView): OfflinePage => OFFLINE_PAGES.find((page) => page.view === view)!;

/**
 * The offline page for a screen that could not load: its own when it has one,
 * otherwise Billing — the counter's first need with no internet.
 */
export function offlinePageFor(pathname: string): OfflinePage {
  return OFFLINE_PAGES.find((page) => page.standsInFor.includes(pathname)) ?? offlinePage("billing");
}
