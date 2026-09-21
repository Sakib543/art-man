"use client";

import { AlertCircle } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { num, rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { quickAddAction } from "../actions";
import type { Sheet, SheetCell } from "../grid";

interface WorksheetGridProps {
  sheet: Sheet;
  closed: boolean;
  quickAddIds: string[];
}

const head = "min-w-32 border-l px-3.5 py-2 text-right text-[12.5px] font-medium text-muted-foreground first:border-l-0";
const cellClass = "min-w-32 border-l px-3.5 py-2.5 align-top first:border-l-0";

function Cell({ cell }: { cell?: SheetCell }) {
  if (!cell) return null;
  return (
    <div className="text-right">
      <p
        className={cn(
          "font-medium tabular-nums",
          cell.status === "cancelled" && "text-muted-foreground line-through",
          cell.amount < 0 && "text-destructive",
        )}
      >
        {num(cell.amount)}
      </p>
      <p className="text-[12.5px] text-muted-foreground">
        #{cell.billNo} {cell.label}
      </p>
    </div>
  );
}

export function WorksheetGrid({ sheet, closed, quickAddIds }: WorksheetGridProps) {
  const [payMode, setPayMode] = useState<"cash" | "online">("cash");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function add(event: FormEvent, staffId: string) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await quickAddAction({ staffId, amount: Number(amounts[staffId]) || 0, payMode });
      if (!result.ok) return setError(result.error);
      setAmounts((current) => ({ ...current, [staffId]: "" }));
    });
  }

  return (
    <div className="rounded-[14px] border bg-card">
      {!closed ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-b px-[18px] py-3">
          <span className="text-[12.5px] text-muted-foreground">Quick add paid by</span>
          <div className="grid min-w-44 grid-cols-2 gap-0.5 rounded-[9px] bg-secondary p-[3px]" role="radiogroup">
            {(["cash", "online"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={payMode === mode}
                onClick={() => setPayMode(mode)}
                className={cn(
                  "min-h-8 rounded-[7px] px-2 text-[13.5px] capitalize",
                  payMode === mode ? "bg-white font-medium shadow-sm" : "text-muted-foreground",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#fafbfc]">
              {sheet.columns.map(({ staff }) => (
                <th key={staff.id} className={head}>
                  {staff.name} {!staff.active ? <Badge className="ml-1 bg-secondary text-muted-foreground">Inactive</Badge> : null}
                </th>
              ))}
              <th className={cn(head, "bg-brass-soft text-brass-strong")}>Owner / Account</th>
            </tr>
            {!closed ? (
              <tr className="border-b bg-[#fafbfc]">
                {sheet.columns.map(({ staff }) => (
                  <td key={staff.id} className="min-w-32 border-l px-2.5 py-2 first:border-l-0">
                    {quickAddIds.includes(staff.id) ? (
                      <form onSubmit={(event) => add(event, staff.id)}>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
                          value={amounts[staff.id] ?? ""}
                          onChange={(event) => setAmounts((current) => ({ ...current, [staff.id]: event.target.value }))}
                          placeholder="+ amount, Enter"
                          aria-label={`Quick add for ${staff.name}`}
                          disabled={pending}
                          className="h-9 tabular-nums"
                        />
                      </form>
                    ) : null}
                  </td>
                ))}
                <td className="min-w-32 border-l bg-brass-soft px-3.5 py-2 text-[12.5px] text-muted-foreground">
                  Online bills land here
                </td>
              </tr>
            ) : null}
          </thead>
          <tbody>
            {Array.from({ length: sheet.rowCount }, (_, row) => (
              <tr key={row} className="border-b">
                {sheet.columns.map(({ staff, cells }) => (
                  <td key={staff.id} className={cellClass}>
                    <Cell cell={cells[row]} />
                  </td>
                ))}
                <td className={cn(cellClass, "bg-brass-soft")}>
                  <Cell cell={sheet.owner.cells[row]} />
                </td>
              </tr>
            ))}
            <tr className="bg-[#fbf8f3] font-semibold">
              {sheet.columns.map(({ staff, total }) => (
                <td key={staff.id} className={cn(cellClass, "text-right tabular-nums")}>
                  {rs(total)}
                </td>
              ))}
              <td className={cn(cellClass, "bg-brass-soft text-right tabular-nums")}>{rs(sheet.owner.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {error ? (
        <p role="alert" className="flex items-center gap-1.5 border-t px-[18px] py-3 text-[12.5px] text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <div className="space-y-1 border-t px-[18px] py-4">
        <div className="flex justify-between text-xl font-semibold">
          <span>Grand total for the day</span>
          <span className="tabular-nums">{rs(sheet.grandTotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Cash in drawer from sales</span>
          <span className="tabular-nums">{rs(sheet.cashSales)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Owner / Account (online, straight to the Owner)</span>
          <span className="tabular-nums">{rs(sheet.onlineSales)}</span>
        </div>
        <p className="pt-1.5 text-[12.5px] text-muted-foreground">
          The grand total is all the staff columns and matches Total sales in the Daily report. The Owner / Account
          column is the online part of that total, not extra. Cancelled amounts are struck through and their reversal
          shows in red.
        </p>
      </div>
    </div>
  );
}
