"use client";

import { useState } from "react";
import { Field } from "@/components/field";
import { FormDialog } from "@/components/form-dialog";
import { Input } from "@/components/ui/input";
import { saveServiceAction } from "../actions";
import type { ServiceRow } from "../types";

interface ServiceFormProps {
  service: ServiceRow | null;
  /** Existing categories, offered as suggestions so spelling stays consistent. */
  categories: string[];
  open: boolean;
  onClose: () => void;
}

export function ServiceForm({ service, categories, open, onClose }: ServiceFormProps) {
  const [name, setName] = useState(service?.name ?? "");
  const [category, setCategory] = useState(service?.category ?? "");
  const [price, setPrice] = useState(String(service?.price ?? ""));
  const [minutes, setMinutes] = useState(service?.minutes ? String(service.minutes) : "");
  const [active, setActive] = useState(service?.active ?? true);

  const editing = service !== null;

  return (
    <FormDialog
      open={open}
      title={editing ? `Edit ${service.name}` : "Add service"}
      description={editing ? "A new price applies to new bills only. Old bills keep the price they were charged." : undefined}
      onClose={onClose}
      onSubmit={() =>
        saveServiceAction({
          id: service?.id,
          name,
          category,
          price: Number(price) || 0,
          minutes: minutes ? Number(minutes) : null,
          active,
        })
      }
    >
      <Field label="Name" htmlFor="service-name">
        <Input id="service-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" autoFocus />
      </Field>

      <Field label="Category" htmlFor="service-category" hint="Becomes a tab on the Billing screen.">
        <Input
          id="service-category"
          list="service-categories"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10"
        />
        <datalist id="service-categories">
          {categories.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (Rs)" htmlFor="service-price">
          <Input
            id="service-price"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-10 tabular-nums"
          />
        </Field>
        <Field label="Minutes (optional)" htmlFor="service-minutes">
          <Input
            id="service-minutes"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="h-10 tabular-nums"
          />
        </Field>
      </div>

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
