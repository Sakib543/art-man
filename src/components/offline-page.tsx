"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { BusinessDayPill } from "@/components/business-day-pill";
import { CatalogSync } from "@/components/catalog-sync";
import { DaySync } from "@/components/day-sync";
import { OutboxSync } from "@/components/outbox-sync";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { useConnectivity } from "@/components/use-connectivity";
import { useOutbox } from "@/components/use-outbox";
import { formatTime } from "@/lib/format";
import { dayFor } from "@/lib/offline/day";
import { closeOf } from "@/lib/offline/outbox";
import { OFFLINE_PAGES, offlinePage, type OfflineView } from "@/lib/offline/pages";
import { offlineTrust, trustRefusal } from "@/lib/offline/session";
import { noteClock, onCatalogSaved, onDaySaved, readCatalog, readDay, type StoredCatalog, type StoredDay } from "@/lib/offline/store";
import { cn } from "@/lib/utils";

/** What an offline screen is drawn from, once this computer may work offline. */
export interface OfflineReady {
  copy: StoredCatalog;
  /** When working offline ends: 12 hours from the last sign-in the server confirmed. */
  until: number;
  /** The open day when this computer last had the internet — the day everything made here goes into. */
  businessDate: string;
  /** That day's bills and entries as the server last had them, or null when this computer has no copy of that day. */
  day: StoredDay | null;
}

type Loaded =
  | { status: "loading" }
  | ({ status: "ready" } & OfflineReady)
  | { status: "refused"; title?: string; message: string };

const REFUSED_TITLE = "Working offline is not available";

/** Read the copies, and decide whether this computer may work offline on them. */
async function load(view: OfflineView): Promise<Loaded> {
  const [copy, day, seen] = await Promise.all([readCatalog().catch(() => null), readDay().catch(() => null), noteClock()]);
  const what = view === "folders" ? "entry" : view === "day-close" ? "close" : "bill";
  const trust = offlineTrust(copy?.savedAt ?? null, Date.now(), seen);
  if (!trust.ok) return { status: "refused", message: trustRefusal(trust, what) };
  if (!copy) return { status: "refused", message: trustRefusal({ ok: false, reason: "no-copy" }, what) };
  const businessDate = copy.catalog.businessDate;
  if (!businessDate) {
    return view === "day-close"
      ? {
          status: "refused",
          title: "No business day is open",
          // Also what this page says just after a close made here reached the server (P2.2f).
          message:
            "The last business day has been closed, and the next one has not been started. It is started on the full Day close screen, which needs the internet.",
        }
      : {
          status: "refused",
          message:
            "No business day was open when this computer last had the internet, so there is no day to work in. Use the paper bill book.",
        };
  }
  return { status: "ready", copy, until: trust.until, businessDate, day: dayFor(day, businessDate) };
}

/**
 * The frame of every offline page (backlog P2.2d, P2.2e, P2.2f) — offline
 * billing, Daily folders, the Register and Day close: the pages the service
 * worker keeps and opens when the full screens cannot load.
 *
 * Everything on them comes from this browser: the catalog copy (P2.2b), the
 * copy of the day (P2.2e) and the outbox (P2.2c). They are static and outside
 * the signed-in shell, so this frame mounts what the shell otherwise would —
 * the outbox's sync and both copies' refreshes — and they do their work as
 * soon as the internet is back.
 *
 * Working offline runs for 12 hours after the server last confirmed the
 * sign-in. A screen is not taken away mid-bill when that runs out: a Save
 * itself refuses, and says why.
 *
 * Moving between the pages is a plain link: each is a page of its own, and
 * the worker has to be the one to open it.
 */
export function OfflinePage({
  view,
  subtitle,
  children,
}: {
  view: OfflineView;
  /** What the screen does offline, after whose sign-in it runs on. */
  subtitle: string;
  children: (ready: OfflineReady) => ReactNode;
}) {
  const online = useConnectivity();
  const outbox = useOutbox();
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
  const page = offlinePage(view);

  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      void load(view).then((next) => {
        if (!cancelled) setLoaded(next);
      });
    refresh();
    // A copy fetched when the internet comes back renews the 12 hours, and a
    // new copy of the day shows what the server has now.
    const stopCatalog = onCatalogSaved(refresh);
    const stopDay = onDaySaved(refresh);
    return () => {
      cancelled = true;
      stopCatalog();
      stopDay();
    };
  }, [view]);

  if (loaded.status === "loading") {
    return <main className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">Opening offline…</main>;
  }

  if (loaded.status === "refused") {
    return (
      <main className="mx-auto grid min-h-[70vh] w-full max-w-md place-items-center px-4">
        {/* When the internet is back, a fresh copy ends this refusal by itself. */}
        <CatalogSync />
        <DaySync />
        <Panel className="w-full p-6 text-center">
          <WifiOff className="mx-auto size-8 text-warning" aria-hidden />
          <h1 className="mt-3 text-lg font-semibold">{loaded.title ?? REFUSED_TITLE}</h1>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">{loaded.message}</p>
          <a href={page.online} className="mt-4 inline-block text-sm font-medium underline underline-offset-2">
            Try the full {page.label} screen
          </a>
        </Panel>
      </main>
    );
  }

  const { copy, until } = loaded;

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pt-5 pb-12 sm:px-6 lg:px-8">
      {/* Drawn from the copies, not the server: what is sent shows up through the day's copy. */}
      <OutboxSync refreshScreen={false} />
      <CatalogSync />
      <DaySync />

      <nav aria-label="Offline screens" className="mb-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b">
        {OFFLINE_PAGES.map((each) => (
          <a
            key={each.view}
            href={each.href}
            aria-current={each.view === view ? "page" : undefined}
            className={cn(
              "-mb-px flex min-h-10 items-center border-b-2 px-2.5 text-sm whitespace-nowrap",
              each.view === view
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {each.label}
          </a>
        ))}
      </nav>

      <PageHeader
        title={`${page.label} — offline`}
        subtitle={`On ${copy.user.name}'s sign-in, until ${formatTime(new Date(until).toISOString())}. ${subtitle}`}
      >
        {/* Closed on this computer (P2.2f): the server still has it open until the close arrives. */}
        <BusinessDayPill businessDate={loaded.businessDate} closed={closeOf(outbox, loaded.businessDate) !== null} />
      </PageHeader>

      {online ? (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-info-line bg-info-soft px-3.5 py-2.5 text-sm text-info"
        >
          <p className="min-w-0 flex-1">
            The internet is back. What was kept on this computer is being sent to the server by itself.
          </p>
          {/* A full page load, not a client navigation: the full screen is a different app shell. */}
          <a href={page.online} className="font-medium underline underline-offset-2">
            Open the full {page.label} screen
          </a>
        </div>
      ) : null}

      {children(loaded)}
    </main>
  );
}
