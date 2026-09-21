"use client";

import { Receipt, X } from "lucide-react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import type { PricedLine } from "@/lib/accounting";
import { num, rs } from "@/lib/format";
import { commonStaff, type CartLine } from "../cart-state";
import type { CatalogDeal, StaffOption } from "../types";

interface CartLinesProps {
  lines: CartLine[];
  priced: PricedLine[];
  staff: StaffOption[];
  dealsById: Record<string, CatalogDeal>;
  onStaff: (key: string, staffId: string | null) => void;
  onAllStaff: (staffId: string | null) => void;
  onRemove: (key: string) => void;
}

const NOTE_TEXT = { "special-rate": "Special rate", "deal-share": "Deal share" } as const;

export function CartLines({ lines, priced, staff, dealsById, onStaff, onAllStaff, onRemove }: CartLinesProps) {
  if (lines.length === 0) {
    return (
      <div className="px-2.5 py-7 text-center text-muted-foreground">
        <Receipt className="mx-auto mb-1.5 size-7 text-[#b7bec9]" aria-hidden />
        <p>Add a service or deal to start the bill</p>
      </div>
    );
  }

  const same = commonStaff(lines);
  const mixed = !same && lines.some((line) => line.staffId);

  return (
    <>
      <div className="border-b px-[18px] py-3">
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
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">
            Different staff per service? Change the line below.
          </p>
        ) : null}
      </div>

      <div className="px-[18px] py-1">
        {lines.map((line, index) => {
          const price = priced[index];
          const deal = line.dealId ? dealsById[line.dealId] : null;
          const startsDeal = deal && lines[index - 1]?.dealInstanceId !== line.dealInstanceId;

          return (
            <div key={line.key}>
              {startsDeal ? (
                <p className="pt-2.5 text-xs font-medium text-brass-strong">
                  {deal.name} ({rs(deal.price)})
                </p>
              ) : null}
              <div className="grid grid-cols-[minmax(0,1fr)_128px_70px_26px] items-center gap-2 border-b py-2.5 last:border-b-0">
                <div>
                  <p className="font-medium">{price?.name}</p>
                  {price?.note ? <p className="text-xs text-muted-foreground">{NOTE_TEXT[price.note]}</p> : null}
                </div>
                <NativeSelect
                  size="sm"
                  className="w-full"
                  aria-label={`Staff for ${price?.name}`}
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
                <p className="text-right font-medium tabular-nums">{num(price?.amount ?? 0)}</p>
                <button
                  type="button"
                  onClick={() => onRemove(line.key)}
                  aria-label={`Remove ${price?.name}`}
                  className="grid place-items-center rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
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
