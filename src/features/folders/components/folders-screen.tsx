"use client";

import { CloudUpload, QrCode, UserRound, Users, Wallet } from "lucide-react";
import { useMemo } from "react";
import { StatCard } from "@/components/stat-card";
import { useOutbox } from "@/components/use-outbox";
import { folderTotals } from "@/lib/accounting";
import { rs } from "@/lib/format";
import { knownIds } from "@/lib/offline/day";
import { pendingEntryRows, pendingOnlineRows } from "../rows";
import type { FoldersData } from "../types";
import { EntriesTable } from "./entries-table";
import { EntryAttention } from "./entry-attention";
import { EntryForm } from "./entry-form";

/**
 * The Daily folders screen (spec 5.2): four totals, the day's entries and
 * online payments, and the form for a new entry.
 *
 * Since P2.2e the same screen serves online and offline. It is drawn from the
 * server's rows — or, on the offline page, the offline copy of the day's — and
 * adds what was made offline and is still on this computer, so the counter
 * sees the whole day either way. The totals are worked out here, from all of
 * it, by the same `folderTotals` the server used.
 */
export function FoldersScreen({ data, offlineOnly = false }: { data: FoldersData; offlineOnly?: boolean }) {
  const items = useOutbox();
  const knownEntries = useMemo(() => knownIds(data.entries), [data.entries]);
  const knownBills = useMemo(() => knownIds(data.online), [data.online]);

  const pendingEntries = pendingEntryRows(items, data.businessDate, knownEntries);
  const pendingOnline = pendingOnlineRows(items, data.businessDate, knownBills);
  const entries = [...pendingEntries, ...data.entries];
  const online = [...pendingOnline, ...data.online];
  const totals = folderTotals(
    entries,
    online.reduce((sum, row) => sum + row.amount, 0),
  );
  const notSent = pendingEntries.length + pendingOnline.length;

  return (
    <>
      <EntryAttention />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Expenses from drawer"
          value={rs(totals.expensesFromDrawer)}
          hint={`+ ${rs(totals.expensesFromOwner)} paid by Owner`}
        />
        <StatCard icon={Users} label="Staff advances" value={rs(totals.staffAdvances)} hint="Comes off the khata" />
        <StatCard
          icon={UserRound}
          label="Owner took cash"
          value={rs(totals.ownerTook)}
          hint={totals.ownerAdded ? `${rs(totals.ownerAdded)} added` : undefined}
        />
        <StatCard icon={QrCode} label="Online payments" value={rs(totals.onlineSales)} hint="Goes to Owner's bank" />
      </div>

      {notSent > 0 ? (
        <p role="status" className="mb-4 flex items-start gap-2 text-sm text-muted-foreground">
          <CloudUpload className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          <span>
            The totals include {notSent === 1 ? "1 line" : `${notSent} lines`} made offline and marked &ldquo;Not sent
            yet&rdquo;. {notSent === 1 ? "It goes" : "They go"} to the server by{" "}
            {notSent === 1 ? "itself" : "themselves"} when the internet is back.
          </span>
        </p>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <EntriesTable entries={entries} online={online} />
        <EntryForm staff={data.staff} businessDate={data.businessDate} offlineOnly={offlineOnly} />
      </div>
    </>
  );
}
