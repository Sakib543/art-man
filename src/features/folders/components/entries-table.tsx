"use client";

import { Panel } from "@/components/panel";
import { AlertCircle } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatTime, rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { voidEntryAction } from "../actions";
import type { EntryRow, OnlineRow } from "../types";

const td = "md:px-3.5 md:py-2.5";

type Filter = "all" | "expense" | "staff" | "owner" | "online";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "expense", label: "Expenses" },
  { id: "staff", label: "Staff" },
  { id: "owner", label: "Owner" },
  { id: "online", label: "Online" },
];

const groupOf = (entry: EntryRow): Exclude<Filter, "all" | "online"> =>
  entry.kind === "expense" ? "expense" : entry.kind.startsWith("staff") ? "staff" : "owner";

function describe(entry: EntryRow): string {
  const text = entry.description ?? "";
  switch (entry.kind) {
    case "owner_took":
      return entry.isVoid ? text : `Cash taken: ${text}`;
    case "owner_added":
      return entry.isVoid ? text : `Cash added: ${text}`;
    default:
      return text;
  }
}

interface Row {
  key: string;
  createdAt: string;
  group: Exclude<Filter, "all">;
  entry?: EntryRow;
  online?: OnlineRow;
}

export function EntriesTable({ entries, online }: { entries: EntryRow[]; online: OnlineRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  // `target` is kept after closing so the dialog does not go blank while it animates out.
  const [target, setTarget] = useState<EntryRow | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => {
    const all: Row[] = [
      ...entries.map<Row>((entry) => ({ key: entry.id, createdAt: entry.createdAt, group: groupOf(entry), entry })),
      ...online.map<Row>((row) => ({ key: `bill-${row.billNo}`, createdAt: row.createdAt, group: "online", online: row })),
    ];
    return all
      .filter((row) => filter === "all" || row.group === filter)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [entries, online, filter]);

  function openFor(entry: EntryRow) {
    setTarget(entry);
    setReason("");
    setError("");
    setOpen(true);
  }

  function confirm() {
    if (!target) return;
    startTransition(async () => {
      const result = await voidEntryAction({ entryId: target.id, reason });
      if (!result.ok) return setError(result.error);
      setOpen(false);
    });
  }

  return (
    <Panel>
      <div className="flex gap-1 overflow-x-auto overflow-y-hidden border-b px-card" role="tablist">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
            className={cn(
              "-mb-px min-h-10 border-b-2 px-2.5 text-sm whitespace-nowrap",
              filter === id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Cells pad from `md` up only: below it `.table-stacked` spaces each
          card itself, and a bare utility would beat it (HANDOFF 8.11). A cell
          with nothing in it is hidden on a phone rather than left as a blank
          line — the badges when there are none, Cancel on a cancelled entry. */}
      <div className="md:overflow-x-auto">
        <table className="table-stacked w-full text-sm">
          <thead>
            <tr className="border-b bg-surface-sunken text-left text-xs text-muted-foreground">
              <th className="px-3.5 py-2 font-medium">Time</th>
              <th className="px-3.5 py-2 font-medium">Folder</th>
              <th className="px-3.5 py-2 font-medium">Details</th>
              <th className="px-3.5 py-2 font-medium" />
              <th className="px-3.5 py-2 text-right font-medium">Amount</th>
              <th className="px-3.5 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, createdAt, entry, online: bill }) => {
              const muted = entry && (entry.voided || entry.isVoid);
              return (
                <tr key={key} className={cn("border-b last:border-b-0", muted && "text-muted-foreground")}>
                  <td className={cn(td, "tabular-nums")} data-label="Time">
                    {formatTime(createdAt)}
                  </td>
                  <td className={td}>
                    {bill ? <Badge variant="success">Online</Badge> : null}
                    {entry?.kind === "expense" ? <Badge variant="secondary">Expense</Badge> : null}
                    {entry?.kind.startsWith("staff") ? <Badge variant="brass">Staff</Badge> : null}
                    {entry?.kind.startsWith("owner") ? <Badge variant="info">Owner</Badge> : null}
                  </td>
                  <td className={cn(td, entry?.voided && "line-through")} data-row-title="">
                    {bill ? (
                      <>
                        Bill #{bill.billNo}, {bill.customerName ?? "Walk-in"}{" "}
                        <span className="text-xs text-muted-foreground">(to Owner&apos;s bank)</span>
                      </>
                    ) : entry ? (
                      <>
                        {describe(entry)}
                        {entry.paidFrom === "owner" ? (
                          <span className="text-xs text-muted-foreground"> (paid by Owner, not from drawer)</span>
                        ) : null}
                      </>
                    ) : null}
                  </td>
                  <td className={cn(td, "max-md:empty:hidden")}>
                    {entry?.pinConfirmed ? <Badge variant="success">PIN confirmed</Badge> : null}
                    {entry?.voided ? <Badge variant="destructive">Cancelled</Badge> : null}
                    {entry?.isVoid ? <Badge variant="secondary">Cancellation</Badge> : null}
                  </td>
                  <td className={cn(td, "text-right font-medium tabular-nums")} data-label="Amount">
                    {rs(bill ? bill.amount : entry!.amount)}
                  </td>
                  <td className={cn(td, "text-right max-md:mt-1 max-md:border-t max-md:pt-2 max-md:empty:hidden")}>
                    {entry && !entry.voided && !entry.isVoid ? (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => openFor(entry)}>
                        Cancel
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No entries yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel this entry?</DialogTitle>
            <DialogDescription>
              {target ? `${describe(target)}, ${rs(target.amount)}. ` : ""}It stays in the record as cancelled and a
              cancellation is added. Nothing is deleted.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required), e.g. entered twice"
            aria-label="Reason for cancelling"
            rows={3}
          />
          {error ? (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-4" aria-hidden />
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep entry
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={pending}>
              {pending ? "Cancelling..." : "Cancel entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
