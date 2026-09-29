"use client";

import { OfflinePage } from "@/components/offline-page";
import type { BillingData } from "../types";
import { BillingScreen } from "./billing-screen";
import { NeedsAttention } from "./needs-attention";
import { PendingBills } from "./pending-bills";

/**
 * The counter's billing with no server (backlog P2.2d), at `/offline-billing`:
 * the page the service worker opens when Billing cannot be loaded.
 *
 * Everything on it comes from this browser — the catalog copy (P2.2b) and the
 * outbox (P2.2c) — and every bill goes to the outbox, whatever the connection
 * does, until the counter goes back to the full screen. The frame around it —
 * the 12-hour check, the sync, the tabs to the other offline pages — is
 * `OfflinePage` (P2.2e).
 */
export function OfflineBilling() {
  return (
    <OfflinePage view="billing" subtitle="Bills are kept on this computer and sent when the internet is back.">
      {({ copy, businessDate }) => {
        const data: BillingData = {
          businessDate,
          // Not known offline; the screen shows "Offline" in its place.
          nextBillNo: 0,
          services: copy.catalog.services,
          deals: copy.catalog.deals,
          staff: copy.catalog.staff,
        };
        return (
          <>
            <NeedsAttention fixing={null} />
            {/* A new day's copy starts a clean screen for that day. */}
            <BillingScreen key={businessDate} data={data} offlineOnly />
            <PendingBills className="mt-4" />
          </>
        );
      }}
    </OfflinePage>
  );
}
