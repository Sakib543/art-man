"use client";

import { AlertCircle, Plus } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkShares, partnerShares } from "@/lib/accounting";
import { rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import { addPartnerAction, saveSharesAction } from "../actions";
import type { PartnerRow } from "../types";

interface SharesCardProps {
  partners: PartnerRow[];
  netProfit: number;
  monthLabel: string;
}

/** Edit the partners' names and profit shares. Shares must add up to 100%. */
export function SharesCard({ partners, netProfit, monthLabel }: SharesCardProps) {
  const [draft, setDraft] = useState(() => partners.map((p) => ({ ...p, pct: String(p.sharePct) })));
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const percents = draft.map((p) => Number(p.pct) || 0);
  const total = checkShares(percents);
  const preview = total.ok ? partnerShares(netProfit, draft.map((p, i) => ({ id: p.id, sharePct: percents[i] }))) : null;

  function update(index: number, change: Partial<(typeof draft)[number]>) {
    setSaved(false);
    setDraft((rows) => rows.map((row, i) => (i === index ? { ...row, ...change } : row)));
  }

  function save() {
    setError("");
    startTransition(async () => {
      const result = await saveSharesAction({ partners: draft.map((p, i) => ({ id: p.id, name: p.name, sharePct: percents[i] })) });
      if (!result.ok) return setError(result.error);
      setSaved(true);
    });
  }

  function add(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await addPartnerAction({ name: newName });
      if (!result.ok) return setError(result.error);
      setNewName("");
    });
  }

  return (
    <div className="rounded-[14px] border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">Profit share</h2>
        <Badge className={total.ok ? "bg-success-soft text-success" : "bg-danger-soft text-destructive"}>Total {total.total}%</Badge>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-[#fafbfc] text-left text-[12.5px] text-muted-foreground">
            <th className="px-[18px] py-2 font-medium">Partner</th>
            <th className="w-32 px-[18px] py-2 font-medium">Share %</th>
            <th className="px-[18px] py-2 text-right font-medium">Share of net profit</th>
          </tr>
        </thead>
        <tbody>
          {draft.map((row, index) => (
            <tr key={row.id} className="border-b">
              <td className="px-[18px] py-2">
                <Input value={row.name} onChange={(e) => update(index, { name: e.target.value })} aria-label="Partner name" className="h-9" />
              </td>
              <td className="px-[18px] py-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  inputMode="decimal"
                  value={row.pct}
                  onChange={(e) => update(index, { pct: e.target.value })}
                  aria-label={`${row.name} share`}
                  className="h-9 tabular-nums"
                />
              </td>
              <td className={cn("px-[18px] py-2 text-right tabular-nums", preview && preview[row.id] < 0 && "text-destructive")}>
                {preview ? rs(preview[row.id]) : "-"}
              </td>
            </tr>
          ))}
          <tr className="bg-[#fbf8f3] font-semibold">
            <td className="px-[18px] py-2.5">Net profit, {monthLabel}</td>
            <td className="px-[18px] py-2.5 tabular-nums">{total.total}%</td>
            <td className="px-[18px] py-2.5 text-right tabular-nums">{rs(netProfit)}</td>
          </tr>
        </tbody>
      </table>

      <div className="space-y-3 border-t px-[18px] py-4">
        {error ? (
          <p role="alert" className="flex items-center gap-1.5 text-[12.5px] text-destructive">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button className="h-10" onClick={save} disabled={pending || !total.ok}>
            {pending ? "Saving..." : "Save shares"}
          </Button>
          {saved ? <span className="text-[12.5px] text-success">Saved</span> : null}
        </div>
        <form onSubmit={add} className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New partner's name" aria-label="New partner's name" className="h-10 max-w-64" />
          <Button type="submit" variant="outline" className="h-10" disabled={pending}>
            <Plus aria-hidden />
            Add partner
          </Button>
        </form>
        <p className="text-[12.5px] text-muted-foreground">
          Shares must add up to 100%. A change applies from now on; a month that is already closed keeps the shares it
          closed with. A new partner starts at 0%.
        </p>
      </div>
    </div>
  );
}
