"use client";

import { Panel, PanelHeader } from "@/components/panel";
import { AlertCircle, Plus } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Field } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rs } from "@/lib/format";
import { addFixedLineAction, setFixedAction } from "../actions";
import type { FixedLineRow } from "../types";

interface FixedLinesCardProps {
  month: string;
  lines: FixedLineRow[];
  total: number;
  closed: boolean;
}

/** One line: its amount for the month. A Save button appears only when the amount was changed. */
function FixedRow({ month, line, closed, onError }: { month: string; line: FixedLineRow; closed: boolean; onError: (message: string) => void }) {
  const [value, setValue] = useState(line.amount ? String(line.amount) : "");
  const [pending, startTransition] = useTransition();
  const changed = (Number(value) || 0) !== line.amount;

  function save(event: FormEvent) {
    event.preventDefault();
    onError("");
    startTransition(async () => {
      const result = await setFixedAction({ month, lineId: line.id, amount: Number(value) || 0 });
      if (!result.ok) onError(result.error);
    });
  }

  return (
    <tr className="border-b">
      <td className="px-card py-2.5">
        {line.name}
        {line.paidByOwner ? <Badge variant="brass" className="ml-2">Owner pays</Badge> : null}
        {!line.active ? <Badge variant="secondary" className="ml-2">Inactive</Badge> : null}
        {line.amount === 0 && !closed ? <Badge variant="warning" className="ml-2">Not entered</Badge> : null}
      </td>
      <td className="w-56 px-card py-2">
        <form onSubmit={save} className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="0"
            aria-label={`${line.name} amount`}
            disabled={closed || pending}
            className="h-9 tabular-nums"
          />
          {changed && !closed ? (
            <Button type="submit" size="sm" className="h-9" disabled={pending}>
              {pending ? "..." : "Save"}
            </Button>
          ) : null}
        </form>
      </td>
    </tr>
  );
}

export function FixedLinesCard({ month, lines, total, closed }: FixedLinesCardProps) {
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [paidByOwner, setPaidByOwner] = useState(false);
  const [pending, startTransition] = useTransition();

  function addLine(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await addFixedLineAction({ name, paidByOwner });
      if (!result.ok) return setError(result.error);
      setName("");
      setPaidByOwner(false);
    });
  }

  return (
    <Panel>
      <PanelHeader title="Fixed monthly" />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {lines.map((line) => (
              <FixedRow key={line.id} month={month} line={line} closed={closed} onError={setError} />
            ))}
            <tr className="bg-brass-tint font-semibold">
              <td className="px-card py-2.5">Total fixed</td>
              <td className="px-card py-2.5 text-right tabular-nums">{rs(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {error ? (
        <p role="alert" className="flex items-center gap-1.5 border-t px-card py-3 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      {!closed ? (
        <form onSubmit={addLine} className="space-y-2.5 border-t px-card py-4">
          <Field label="Add a fixed line" htmlFor="fixed-line-name" hint="Type the amount in its row. Changing it later adds a correction; the old figure stays in the record.">
            <div className="flex gap-2">
              <Input id="fixed-line-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Generator fuel" className="h-10" />
              <Button type="submit" variant="outline" disabled={pending}>
                <Plus aria-hidden />
                Add
              </Button>
            </div>
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={paidByOwner} onChange={(event) => setPaidByOwner(event.target.checked)} className="size-4 accent-primary" />
            The Owner pays this from his own account
          </label>
        </form>
      ) : null}
    </Panel>
  );
}
