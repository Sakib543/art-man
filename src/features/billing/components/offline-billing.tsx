"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { BusinessDayPill } from "@/components/business-day-pill";
import { CatalogSync } from "@/components/catalog-sync";
import { OutboxSync } from "@/components/outbox-sync";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { useConnectivity } from "@/components/use-connectivity";
import { formatTime } from "@/lib/format";
import { offlineTrust, trustRefusal } from "@/lib/offline/session";
import { onCatalogSaved, readCatalog, type StoredCatalog } from "@/lib/offline/store";
import type { BillingData } from "../types";
import { BillingScreen } from "./billing-screen";
import { NeedsAttention } from "./needs-attention";
import { PendingBills } from "./pending-bills";

type Loaded =
  | { status: "loading" }
  | { status: "ready"; copy: StoredCatalog; until: number; businessDate: string }
  | { status: "refused"; message: string };

/** Read the copy, and decide whether this computer may bill offline on it. */
async function load(): Promise<Loaded> {
  const copy = await readCatalog().catch(() => null);
  const trust = offlineTrust(copy?.savedAt ?? null, Date.now());
  if (!trust.ok) return { status: "refused", message: trustRefusal(trust) };
  if (!copy) return { status: "refused", message: trustRefusal({ ok: false, reason: "no-copy" }) };
  const businessDate = copy.catalog.businessDate;
  if (!businessDate) {
    return {
      status: "refused",
      message:
        "No business day was open when this computer last had the internet, so there is no day to bill into. Use the paper bill book.",
    };
  }
  return { status: "ready", copy, until: trust.until, businessDate };
}

/**
 * The counter's billing with no server (backlog P2.2d), at `/offline-billing`:
 * the page the service worker opens when Billing cannot be loaded.
 *
 * Everything on it comes from this browser — the catalog copy (P2.2b) and the
 * outbox (P2.2c) — and every bill goes to the outbox, whatever the connection
 * does, until the counter goes back to the full screen. It also sends the
 * outbox and refreshes the copy when the internet returns, since the signed-in
 * shell that usually does both is not on this page.
 *
 * Offline billing runs for 12 hours after the server last confirmed the
 * sign-in. The screen is not taken away mid-bill when that runs out: the Save
 * itself refuses, and says why.
 */
export function OfflineBilling() {
  const online = useConnectivity();
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      void load().then((next) => {
        if (!cancelled) setLoaded(next);
      });
    refresh();
    // A copy fetched when the internet comes back renews the 12 hours.
    const stop = onCatalogSaved(refresh);
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  if (loaded.status === "loading") {
    return <main className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">Opening offline billing…</main>;
  }

  if (loaded.status === "refused") {
    return (
      <main className="mx-auto grid min-h-[70vh] w-full max-w-md place-items-center px-4">
        <CatalogSync />
        <Panel className="w-full p-6 text-center">
          <WifiOff className="mx-auto size-8 text-warning" aria-hidden />
          <h1 className="mt-3 text-lg font-semibold">Offline billing is not available</h1>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">{loaded.message}</p>
          <a href="/billing" className="mt-4 inline-block text-sm font-medium underline underline-offset-2">
            Try the full Billing screen
          </a>
        </Panel>
      </main>
    );
  }

  const { copy, until, businessDate } = loaded;
  const data: BillingData = {
    businessDate,
    // Not known offline; the screen shows "Offline" in its place.
    nextBillNo: 0,
    services: copy.catalog.services,
    deals: copy.catalog.deals,
    staff: copy.catalog.staff,
  };

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pt-5 pb-12 sm:px-6 lg:px-8">
      <OutboxSync />
      <CatalogSync />

      <PageHeader
        title="Billing — offline"
        subtitle={`On ${copy.user.name}'s sign-in, until ${formatTime(new Date(until).toISOString())}. Bills are kept on this computer and sent when the internet is back.`}
      >
        <BusinessDayPill businessDate={businessDate} />
      </PageHeader>

      {online ? (
        <div
          role="status"
          className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-info-line bg-info-soft px-3.5 py-2.5 text-sm text-info"
        >
          <p className="min-w-0 flex-1">
            The internet is back. Bills kept here are being sent to the server by themselves.
          </p>
          {/* A full page load, not a client navigation: the full screen is a different app shell. */}
          <a href="/billing" className="font-medium underline underline-offset-2">
            Open the full Billing screen
          </a>
        </div>
      ) : null}

      <NeedsAttention fixing={null} />
      {/* A new day's copy starts a clean screen for that day. */}
      <BillingScreen key={businessDate} data={data} offlineOnly />
      <PendingBills className="mt-4" />
    </main>
  );
}
