"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DealRow, ServiceRow } from "../types";
import { DealForm } from "./deal-form";
import { ActiveBadge, PanelCard, td, th } from "./panel-card";

export function DealsPanel({ deals, services }: { deals: DealRow[]; services: ServiceRow[] }) {
  const [editing, setEditing] = useState<DealRow | null | undefined>(undefined);
  const nameOf = (id: string) => services.find((s) => s.id === id)?.name ?? "?";

  return (
    <>
      <PanelCard
        addLabel="Add deal"
        onAdd={() => setEditing(null)}
        note="A deal is hidden from Billing while any of its services is inactive."
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#fafbfc]">
              <th className={th}>Deal</th>
              <th className={th}>Services</th>
              <th className={cn(th, "text-right")}>Price</th>
              <th className={th}>Status</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr key={deal.id} className={cn("border-b last:border-b-0", !deal.active && "text-muted-foreground")}>
                <td className={cn(td, "font-medium")}>{deal.name}</td>
                <td className={td}>{deal.serviceIds.map(nameOf).join(", ")}</td>
                <td className={cn(td, "text-right tabular-nums")}>{num(deal.price)}</td>
                <td className={td}>
                  <ActiveBadge active={deal.active} />
                </td>
                <td className={cn(td, "text-right")}>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(deal)}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
            {deals.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No deals yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </PanelCard>

      {editing !== undefined ? (
        <DealForm key={editing?.id ?? "new"} deal={editing} services={services} open onClose={() => setEditing(undefined)} />
      ) : null}
    </>
  );
}
