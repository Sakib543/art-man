"use client";

import { useState } from "react";
import { Field } from "@/components/field";
import { FormDialog } from "@/components/form-dialog";
import { Input } from "@/components/ui/input";
import { rs } from "@/lib/format";
import { saveDealAction } from "../actions";
import type { DealRow, ServiceRow } from "../types";

interface DealFormProps {
  deal: DealRow | null;
  services: ServiceRow[];
  open: boolean;
  onClose: () => void;
}

export function DealForm({ deal, services, open, onClose }: DealFormProps) {
  const [name, setName] = useState(deal?.name ?? "");
  const [price, setPrice] = useState(String(deal?.price ?? ""));
  const [chosen, setChosen] = useState<string[]>(deal?.serviceIds ?? []);
  const [active, setActive] = useState(deal?.active ?? true);

  const editing = deal !== null;
  const listTotal = services.filter((s) => chosen.includes(s.id)).reduce((sum, s) => sum + s.price, 0);

  const toggle = (id: string) =>
    setChosen((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  return (
    <FormDialog
      open={open}
      title={editing ? `Edit ${deal.name}` : "Add deal"}
      description="The deal price is split across its services by list price, so each staff member's commission is fair."
      onClose={onClose}
      onSubmit={() =>
        saveDealAction({ id: deal?.id, name, price: Number(price) || 0, serviceIds: chosen, active })
      }
    >
      <Field label="Name" htmlFor="deal-name">
        <Input id="deal-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" autoFocus />
      </Field>

      <fieldset className="space-y-1.5">
        <legend className="text-[12.5px] font-medium text-muted-foreground">Services in this deal</legend>
        <div className="max-h-48 overflow-y-auto rounded-lg border p-2">
          {services.map((service) => (
            <label key={service.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 text-sm hover:bg-secondary">
              <input
                type="checkbox"
                checked={chosen.includes(service.id)}
                onChange={() => toggle(service.id)}
                className="size-4 accent-primary"
              />
              <span className="flex-1">{service.name}</span>
              <span className="text-muted-foreground tabular-nums">{rs(service.price)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Deal price (Rs)"
        htmlFor="deal-price"
        hint={chosen.length > 0 ? `Services alone would cost ${rs(listTotal)}.` : undefined}
      >
        <Input
          id="deal-price"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="h-10 tabular-nums"
        />
      </Field>

      {editing ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4 accent-primary"
          />
          Active (can be billed)
        </label>
      ) : null}
    </FormDialog>
  );
}
