"use client";

import { Receipt, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import type { PricedLine } from "@/lib/accounting";
import { num, rs } from "@/lib/format";
import { commonStaff, type CartLine } from "../cart-state";
import type { CatalogDeal, CatalogService, StaffOption } from "../types";

interface CartLinesProps {
  lines: CartLine[];
  priced: PricedLine[];
  staff: StaffOption[];
  dealsById: Record<string, CatalogDeal>;
  /** Needed for the price range: the line has to know what it may charge (P3.11). */
  servicesById: Record<string, CatalogService>;
  /** This customer's fixed prices. A special rate beats a range, so it hides the box. */
  specialRates: Record<string, number>;
  onStaff: (key: string, staffId: string | null) => void;
  onAmount: (key: string, amount: number | null) => void;
  onAllStaff: (staffId: string | null) => void;
  onRemove: (key: string) => void;
}

const NOTE_TEXT: Record<string, string | undefined> = {
  "special-rate": "Special rate",
  "deal-share": "Deal share",
  // "chosen" says nothing useful: the amount box beside it already shows that
  // the counter picked a figure, and the range is written under it (P3.11).
};

export function CartLines({
  lines,
  priced,
  staff,
  dealsById,
  servicesById,
  specialRates,
  onStaff,
  onAmount,
  onAllStaff,
  onRemove,
}: CartLinesProps) {
  if (lines.length === 0) {
    return (
      <div className="px-2.5 py-7 text-center text-muted-foreground">
        <Receipt className="mx-auto mb-1.5 size-7 text-muted-foreground/50" aria-hidden />
        <p>Add a service or deal to start the bill</p>
      </div>
    );
  }

  const same = commonStaff(lines);
  const mixed = !same && lines.some((line) => line.staffId);

  return (
    <>
      <div className="border-b px-card py-3">
        <Label htmlFor="all-staff" className="mb-1.5">
          One person did everything
        </Label>
        <NativeSelect
          id="all-staff"
          className="w-full"
          value={same ?? ""}
          onChange={(event) => onAllStaff(event.target.value || null)}
        >
          <NativeSelectOption value="">
            {mixed ? "Mixed staff: choose to set all" : "Choose staff for all services"}
          </NativeSelectOption>
          {staff.map((member) => (
            <NativeSelectOption key={member.id} value={member.id}>
              {member.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {lines.length > 1 ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Different staff per service? Change the line below.
          </p>
        ) : null}
      </div>

      <div className="px-card py-1">
        {lines.map((line, index) => {
          const price = priced[index];
          const deal = line.dealId ? dealsById[line.dealId] : null;
          // Only a plain line priced from the catalog can be chosen: a deal
          // share and a customer's special rate are already decided.
          //
          // This deliberately does NOT read the priced line. An amount outside
          // the range makes `priceCart` throw, which leaves every priced line
          // undefined — and a box that disappears the moment you type a wrong
          // number into it is a box you cannot correct.
          const service = servicesById[line.serviceId];
          const ranged =
            !deal && service?.maxPrice != null && specialRates[line.serviceId] === undefined ? service : null;
          // The priced line is gone whenever the cart cannot be priced, and a
          // row with no name is no use to the person trying to fix it.
          const name = price?.name ?? service?.name ?? "";
          const startsDeal = deal && lines[index - 1]?.dealInstanceId !== line.dealInstanceId;

          return (
            <div key={line.key}>
              {startsDeal ? (
                <p className="pt-2.5 text-xs font-medium text-brass-strong">
                  {deal.name} ({rs(deal.price)})
                </p>
              ) : null}
              {/*
                On a phone the four-column row does not fit: the fixed columns
                alone came to 248px of a 311px card, leaving sixty for the
                service name. So below `sm` it becomes two rows — name and the
                remove cross on top, staff and the amount underneath — placed
                by grid position rather than by reordering the markup (P6.1).
              */}
              <div className="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-x-2 gap-y-2 border-b py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_128px_70px_26px] sm:gap-y-0 sm:py-2.5">
                <div className="col-start-1 row-start-1 sm:col-auto sm:row-auto">
                  <p className="font-medium">{name}</p>
                  {price?.note ? <p className="text-xs text-muted-foreground">{NOTE_TEXT[price.note]}</p> : null}
                  {ranged ? (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {num(ranged.price)} – {num(ranged.maxPrice!)}
                    </p>
                  ) : null}
                </div>
                <NativeSelect
                  size="sm"
                  className="col-start-1 row-start-2 w-full sm:col-auto sm:row-auto"
                  aria-label={`Staff for ${name}`}
                  value={line.staffId ?? ""}
                  onChange={(event) => onStaff(line.key, event.target.value || null)}
                >
                  <NativeSelectOption value="">Select staff</NativeSelectOption>
                  {staff.map((member) => (
                    <NativeSelectOption key={member.id} value={member.id}>
                      {member.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {/*
                  A service the printed list gives a range for — "300 - 500" —
                  is charged whatever the counter types inside it (P3.11).
                  A deal line and a special rate are not the counter's to
                  choose, so those stay a plain figure.
                */}
                {ranged ? (
                  <Input
                    type="number"
                    min={ranged.price}
                    max={ranged.maxPrice ?? undefined}
                    step={1}
                    inputMode="numeric"
                    aria-label={`Amount for ${name}, between ${ranged.price} and ${ranged.maxPrice}`}
                    value={line.amount ?? ""}
                    placeholder={String(ranged.price)}
                    onChange={(event) => onAmount(line.key, event.target.value === "" ? null : Number(event.target.value))}
                    className="col-start-2 row-start-2 h-8 w-full px-1.5 text-right tabular-nums sm:col-auto sm:row-auto"
                  />
                ) : (
                  <p className="col-start-2 row-start-2 text-right font-medium tabular-nums sm:col-auto sm:row-auto">
                    {num(price?.amount ?? 0)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(line.key)}
                  aria-label={`Remove ${name}`}
                  className="col-start-2 row-start-1 grid size-8 place-items-center justify-self-end rounded-md text-muted-foreground transition-colors hover:bg-danger-soft hover:text-destructive sm:col-auto sm:row-auto sm:size-6.5"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
