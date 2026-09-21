"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CatalogDeal, CatalogService } from "../types";

const DEALS_TAB = "Deals";

interface ServicePickerProps {
  services: CatalogService[];
  deals: CatalogDeal[];
  /** Customer's fixed prices by service id; shown instead of the list price. */
  specialRates: Record<string, number>;
  onAddService: (serviceId: string) => void;
  onAddDeal: (deal: CatalogDeal) => void;
}

const tile =
  "flex min-h-[92px] flex-col gap-2 rounded-[10px] border bg-card p-3 text-left transition-colors hover:border-brass";

export function ServicePicker({ services, deals, specialRates, onAddService, onAddDeal }: ServicePickerProps) {
  const categories = useMemo(() => [...new Set(services.map((s) => s.category)), DEALS_TAB], [services]);
  const [category, setCategory] = useState(categories[0]);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? "";

  const visibleServices = services.filter((s) =>
    q ? s.name.toLowerCase().includes(q) : category !== DEALS_TAB && s.category === category,
  );
  const visibleDeals = deals.filter((d) => (q ? d.name.toLowerCase().includes(q) : category === DEALS_TAB));
  const count = (name: string) =>
    name === DEALS_TAB ? deals.length : services.filter((s) => s.category === name).length;

  return (
    <div className="rounded-[14px] border bg-card">
      <div className="px-[18px] pt-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search services"
            aria-label="Search services"
            className="h-10 pl-8.5"
          />
        </div>
      </div>

      <div className="mt-2.5 flex gap-1 overflow-x-auto overflow-y-hidden border-b px-[18px]" role="tablist">
        {categories.map((name) => {
          const active = !q && category === name;
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setCategory(name);
                setQuery("");
              }}
              className={cn(
                "-mb-px min-h-10 border-b-2 px-2.5 text-sm whitespace-nowrap",
                active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground",
              )}
            >
              {name}
              <span className="ml-1 text-xs text-muted-foreground">{count(name)}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5 p-[18px]">
        {visibleServices.map((service) => {
          const special = specialRates[service.id];
          return (
            <button key={service.id} type="button" className={tile} onClick={() => onAddService(service.id)}>
              <span className="font-medium">{service.name}</span>
              <span className="flex-1 text-[12.5px] text-muted-foreground">
                {service.category}
                {service.minutes ? `, ${service.minutes} min` : ""}
              </span>
              <span className="flex items-center justify-between">
                <b className="text-[15px] font-semibold tabular-nums">{rs(special ?? service.price)}</b>
                {special !== undefined ? <Badge className="bg-brass-soft text-brass-strong">Special rate</Badge> : null}
              </span>
            </button>
          );
        })}

        {visibleDeals.map((deal) => (
          <button key={deal.id} type="button" className={tile} onClick={() => onAddDeal(deal)}>
            <span className="font-medium">{deal.name}</span>
            <span className="flex-1 text-[12.5px] text-muted-foreground">
              {deal.serviceIds.map(serviceName).join(", ")}
            </span>
            <span className="flex items-center justify-between">
              <b className="text-[15px] font-semibold tabular-nums">{rs(deal.price)}</b>
              <Badge className="bg-brass-soft text-brass-strong">Deal</Badge>
            </span>
          </button>
        ))}

        {visibleServices.length === 0 && visibleDeals.length === 0 ? (
          <p className="col-span-full py-7 text-center text-muted-foreground">No services match your search</p>
        ) : null}
      </div>

      {category === DEALS_TAB && !q ? (
        <p className="border-t px-[18px] py-3 text-[12.5px] text-muted-foreground">
          The deal price is split across its services by list price, so each staff member&apos;s commission is correct.
        </p>
      ) : null}
    </div>
  );
}
