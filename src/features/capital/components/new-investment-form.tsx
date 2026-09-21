"use client";

import { AlertCircle } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { contributionsMatch } from "@/lib/accounting";
import { rs } from "@/lib/format";
import { addInvestmentAction } from "../actions";
import type { PartnerOption } from "../types";

export function NewInvestmentForm({ partners }: { partners: PartnerOption[] }) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [funds, setFunds] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const total = Number(cost) || 0;
  const contributed = partners.map((partner) => Number(funds[partner.id]) || 0);
  const match = contributionsMatch(total, contributed);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await addInvestmentAction({
        name,
        totalCost: total,
        contributions: partners.map((partner, index) => ({ partnerId: partner.id, amount: contributed[index] })),
      });
      if (!result.ok) return setError(result.error);
      setName("");
      setCost("");
      setFunds({});
    });
  }

  return (
    <form onSubmit={submit} className="rounded-[14px] border bg-card" noValidate>
      <div className="border-b px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">New investment</h2>
      </div>
      <div className="space-y-3.5 px-[18px] py-4">
        <Field label="Name" htmlFor="capital-name">
          <Input id="capital-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Solar system" className="h-10" />
        </Field>
        <Field label="Total cost (Rs)" htmlFor="capital-cost">
          <Input
            id="capital-cost"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="300000"
            className="h-10 tabular-nums"
          />
        </Field>

        <div className="space-y-2">
          <Label>Who contributed how much</Label>
          {partners.map((partner) => (
            <div key={partner.id} className="grid grid-cols-[minmax(0,1fr)_150px] items-center gap-2">
              <span>{partner.name}</span>
              <Input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={funds[partner.id] ?? ""}
                onChange={(e) => setFunds((current) => ({ ...current, [partner.id]: e.target.value }))}
                placeholder="0"
                aria-label={`${partner.name} contributed`}
                className="h-10 tabular-nums"
              />
            </div>
          ))}
          {total > 0 ? (
            <p className="text-[12.5px] text-muted-foreground">
              {match.ok
                ? "Contributions add up to the total cost."
                : match.difference > 0
                  ? `${rs(match.difference)} still to assign.`
                  : `${rs(-match.difference)} more than the total cost.`}
            </p>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="flex items-center gap-1.5 text-[12.5px] text-destructive">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <Button type="submit" className="h-11 w-full text-[15px]" disabled={pending}>
          {pending ? "Adding..." : "Add investment"}
        </Button>
      </div>
    </form>
  );
}
