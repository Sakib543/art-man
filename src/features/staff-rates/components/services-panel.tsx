"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ServiceRow } from "../types";
import { ActiveBadge, PanelCard, td, th } from "./panel-card";
import { ServiceForm } from "./service-form";

export function ServicesPanel({ services }: { services: ServiceRow[] }) {
  const [editing, setEditing] = useState<ServiceRow | null | undefined>(undefined);
  const categories = [...new Set(services.map((s) => s.category))];

  return (
    <>
      <PanelCard
        addLabel="Add service"
        onAdd={() => setEditing(null)}
        note="A new price applies to new bills only. Old bills keep what they were charged."
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#fafbfc]">
              <th className={th}>Service</th>
              <th className={th}>Category</th>
              <th className={cn(th, "text-right")}>Price</th>
              <th className={cn(th, "text-right")}>Minutes</th>
              <th className={th}>Status</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id} className={cn("border-b last:border-b-0", !service.active && "text-muted-foreground")}>
                <td className={cn(td, "font-medium")}>{service.name}</td>
                <td className={td}>{service.category}</td>
                <td className={cn(td, "text-right tabular-nums")}>{num(service.price)}</td>
                <td className={cn(td, "text-right tabular-nums")}>{service.minutes ?? "-"}</td>
                <td className={td}>
                  <ActiveBadge active={service.active} />
                </td>
                <td className={cn(td, "text-right")}>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(service)}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </PanelCard>

      {editing !== undefined ? (
        <ServiceForm
          key={editing?.id ?? "new"}
          service={editing}
          categories={categories}
          open
          onClose={() => setEditing(undefined)}
        />
      ) : null}
    </>
  );
}
