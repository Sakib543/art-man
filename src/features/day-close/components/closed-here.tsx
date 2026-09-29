"use client";

import { AlertCircle, Banknote, Clock, CloudUpload, ShieldCheck, TriangleAlert, Wallet } from "lucide-react";
import { Panel, PanelHeader } from "@/components/panel";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, num, rs } from "@/lib/format";
import { countOf, describeCounts, type KindCounts, type OutboxCloseEntry } from "@/lib/offline/outbox";
import { differenceOf } from "../offline-close";

/** Where each kind of refused work is put right. */
function RefusedLinks({ refused }: { refused: KindCounts }) {
  const links = [
    refused.bills > 0 ? { href: "/billing", label: "Billing" } : null,
    refused.entries > 0 ? { href: "/folders", label: "Daily folders" } : null,
  ].filter((link): link is { href: string; label: string } => link !== null);
  return (
    <>
      {links.map((link, index) => (
        <span key={link.href}>
          {index > 0 ? " and " : " "}
          <a href={link.href} className="font-medium underline underline-offset-2">
            {link.label}
          </a>
        </span>
      ))}
    </>
  );
}

/**
 * A day closed on this computer whose close has not reached the server yet
 * (backlog P2.2f) — waiting to be sent, or refused. Shown on the offline Day
 * close page, and on the full screen until the close arrives. Everything on it
 * is what the manager saw when closing; the security code is not, because the
 * server makes it when the close arrives.
 *
 * `held`: the day's bills and entries still on this computer, which go before
 * the close; a refused one keeps it waiting for a person.
 */
export function ClosedHere({
  entry,
  held,
  offlinePage = false,
}: {
  entry: OutboxCloseEntry;
  held: { waiting: KindCounts; refused: KindCounts };
  /** On the offline page, where nothing refused can be dealt with until the internet is back. */
  offlinePage?: boolean;
}) {
  const { close, preview } = entry;
  const difference = differenceOf(close);
  const refused = entry.rejected;
  const heldRefused = countOf(held.refused);
  const heldWaiting = countOf(held.waiting);

  return (
    <>
      <Panel className={refused ? "border-danger-line" : undefined}>
        <div className="flex flex-wrap items-start gap-4 px-card py-5">
          <div
            className={
              refused
                ? "grid size-14 shrink-0 place-items-center rounded-xl bg-danger-soft text-destructive"
                : "grid size-14 shrink-0 place-items-center rounded-xl bg-info-soft text-info"
            }
          >
            {refused ? <TriangleAlert className="size-7" aria-hidden /> : <CloudUpload className="size-7" aria-hidden />}
          </div>
          <div className="min-w-60 flex-1 space-y-1.5">
            <p className="text-base font-semibold">
              {formatDate(entry.businessDate)} was closed on this computer, {formatDateTime(entry.madeAt)}
            </p>
            <p className="text-sm text-muted-foreground">By {entry.madeBy || "unknown"}, with no internet.</p>

            {refused ? (
              <p className="flex items-start gap-1.5 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  The server refused this close: {refused.reason}
                  {offlinePage ? " Deal with it on the full Day close screen when the internet is back." : null}
                </span>
              </p>
            ) : heldRefused > 0 ? (
              <p className="rounded-md border border-warning-line bg-warning-soft px-3 py-2 text-sm text-warning">
                It goes to the server once the day&apos;s {describeCounts({ ...held.refused, closes: 0 })} refused by the
                server {heldRefused === 1 ? "has" : "have"} been put right or removed
                {offlinePage ? " — on the full screens, when the internet is back." : <>, on<RefusedLinks refused={held.refused} />.</>}
                {heldWaiting > 0 ? ` ${describeCounts({ ...held.waiting, closes: 0 })} of the day still wait to be sent before it.` : null}
              </p>
            ) : (
              <p className="text-sm">
                {heldWaiting > 0
                  ? `Waiting to be sent, after the day's ${describeCounts({ ...held.waiting, closes: 0 })} still on this computer. They all go by themselves as soon as the server can be reached.`
                  : "Waiting to be sent. It goes by itself as soon as the server can be reached."}
              </p>
            )}
          </div>
          <Badge variant={refused ? "destructive" : "info"}>{refused ? "Refused" : "Not sent yet"}</Badge>
        </div>

        <div className="flex items-start gap-3 border-t bg-surface-sunken px-card py-3.5 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <span className="font-medium text-foreground-soft">Security code: made by the server</span> when the close
            reaches it. It covers the day&apos;s bills in bill-number order, and bills made offline get their numbers
            only then. It is shown on Day close, with the day&apos;s summary, once the internet is back.
          </p>
        </div>
      </Panel>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Banknote} label="Expected" value={rs(close.expected)} hint="Worked out on this computer" />
        <StatCard icon={Wallet} label="Counted" value={rs(close.counted)} />
        <StatCard
          icon={AlertCircle}
          label={difference < 0 ? "Short" : difference > 0 ? "Extra" : "Difference"}
          value={rs(Math.abs(difference))}
          hint={close.reason ?? undefined}
          tone={difference < 0 ? "warning" : "neutral"}
        />
        <StatCard icon={Clock} label="Tomorrow's opening cash" value={rs(close.counted)} />
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="How expected cash was worked out" />
          <table className="w-full text-sm">
            <tbody>
              {preview.breakdown.map((row) => (
                <tr key={row.label} className="border-b">
                  <td className="px-card py-2.5">{row.label}</td>
                  <td className="px-card py-2.5 text-right tabular-nums">
                    {row.amount < 0 ? `-${num(-row.amount)}` : row.amount > 0 ? `+${num(row.amount)}` : "0"}
                  </td>
                </tr>
              ))}
              <tr className="bg-brass-tint font-semibold">
                <td className="px-card py-2.5">Expected cash in drawer</td>
                <td className="px-card py-2.5 text-right tabular-nums">{rs(close.expected)}</td>
              </tr>
            </tbody>
          </table>
          <p className="border-t px-card py-3 text-xs text-muted-foreground">
            Online payments ({rs(preview.onlineSales)}) are not included because they never enter the drawer.
          </p>
        </Panel>

        <Panel>
          <PanelHeader title="Paid to staff at close" />
          {preview.payouts.length > 0 ? (
            <ul className="divide-y text-sm">
              {preview.payouts.map((payout, index) => (
                <li key={`${payout.name}-${index}`} className="flex justify-between gap-3 px-card py-2.5">
                  <span>{payout.name || "Staff member"}</span>
                  <span className="tabular-nums">{rs(payout.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-card py-4 text-sm text-muted-foreground">Nobody was paid at close.</p>
          )}
          <p className="border-t px-card py-3 text-xs text-muted-foreground">
            Nothing more can be added to {formatDate(entry.businessDate)} on this computer. The next day is started on
            Day close once this close has reached the server; only the Owner can reopen the day after that.
          </p>
        </Panel>
      </div>
    </>
  );
}
