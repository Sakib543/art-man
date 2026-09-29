"use client";

import { CloudUpload } from "lucide-react";
import { Panel, PanelHeader } from "@/components/panel";
import { useConnectivity } from "@/components/use-connectivity";
import { useOutbox, useOutboxReady } from "@/components/use-outbox";
import { closeOf, countOf, describeCounts, outboxTally, workOfDay, type KindCounts } from "@/lib/offline/outbox";
import type { CloseStaffRow } from "../types";
import { CloseAttention } from "./close-attention";
import { CloseWizard } from "./close-wizard";
import { ClosedHere } from "./closed-here";

const link = "font-medium underline underline-offset-2";

/**
 * Why the day cannot be closed from here yet (P2.2f): this computer still
 * holds some of it. Closed on the server first, the day would take none of it
 * any more — each is saved only into the day it was made on — so its money
 * would be in the drawer and missing from the books for good.
 */
function HoldBack({ held, online }: { held: { waiting: KindCounts; refused: KindCounts }; online: boolean }) {
  const waiting = countOf(held.waiting);
  return (
    <Panel className="mb-4">
      <PanelHeader
        icon={CloudUpload}
        title="Some of the day is still on this computer"
        description="The day can be closed once all of it has reached the server."
      />
      <div className="space-y-2.5 px-card py-4 text-sm">
        {waiting > 0 ? (
          online ? (
            <p>
              {describeCounts(held.waiting)} made offline {waiting === 1 ? "is" : "are"} being sent to the server. This
              screen moves on by itself once {waiting === 1 ? "it has" : "they have"} arrived.
            </p>
          ) : (
            <p>
              {describeCounts(held.waiting)} made offline {waiting === 1 ? "waits" : "wait"} to be sent, and there is no
              internet. The day can still be closed on this computer, where {waiting === 1 ? "it is" : "they are"}{" "}
              counted:{" "}
              <a href="/offline-day-close" className={link}>
                Day close offline
              </a>
              .
            </p>
          )
        ) : null}
        {held.refused.bills > 0 ? (
          <p className="text-destructive">
            {describeCounts({ ...held.refused, entries: 0 })} made offline {held.refused.bills === 1 ? "was" : "were"}{" "}
            refused by the server. Put {held.refused.bills === 1 ? "it" : "them"} right or remove{" "}
            {held.refused.bills === 1 ? "it" : "them"} on{" "}
            <a href="/billing" className={link}>
              Billing
            </a>
            .
          </p>
        ) : null}
        {held.refused.entries > 0 ? (
          <p className="text-destructive">
            {describeCounts({ ...held.refused, bills: 0 })} made offline {held.refused.entries === 1 ? "was" : "were"}{" "}
            refused by the server. Send {held.refused.entries === 1 ? "it" : "them"} again or remove{" "}
            {held.refused.entries === 1 ? "it" : "them"} on{" "}
            <a href="/folders" className={link}>
              Daily folders
            </a>
            .
          </p>
        ) : null}
      </div>
    </Panel>
  );
}

/**
 * The open day's Day close screen (spec 5.4), and what this computer's outbox
 * says about it (P2.2f):
 *
 * - the day was closed here, offline, and the close waits to be sent: that
 *   close, and what it waits for — never a second one;
 * - some of the day's bills or entries are still here: hold back until they
 *   have reached the server, and say what to do about each;
 * - otherwise the five steps — started from a close the server refused, when
 *   there is one, which closing takes off the list.
 */
export function DayCloseScreen({ businessDate, staff }: { businessDate: string; staff: CloseStaffRow[] }) {
  const items = useOutbox();
  const ready = useOutboxReady();
  const online = useConnectivity();

  // Until the outbox has been read, an empty one means nothing: the steps
  // must not be offered over a close already made here.
  if (!ready) {
    return <p className="py-6 text-sm text-muted-foreground">Checking this computer for work not yet sent…</p>;
  }

  const kept = closeOf(items, businessDate);
  const held = outboxTally(workOfDay(items, businessDate));

  if (kept && kept.rejected === null) return <ClosedHere entry={kept} held={held} />;

  if (countOf(held.waiting) + countOf(held.refused) > 0) {
    return (
      <>
        <CloseAttention openDate={businessDate} />
        <HoldBack held={held} online={online} />
      </>
    );
  }

  return (
    <>
      <CloseAttention openDate={businessDate} />
      {/* A refused close removed starts clean steps; one closed again leaves. */}
      <CloseWizard key={kept?.clientId ?? "new"} staff={staff} businessDate={businessDate} start={kept} />
    </>
  );
}
