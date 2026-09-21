"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DealRow, ServiceRow, StaffRow } from "../types";
import { DealsPanel } from "./deals-panel";
import { ServicesPanel } from "./services-panel";
import { StaffPanel } from "./staff-panel";

type TabId = "staff" | "services" | "deals";

interface StaffRatesScreenProps {
  staff: StaffRow[];
  services: ServiceRow[];
  deals: DealRow[];
}

export function StaffRatesScreen({ staff, services, deals }: StaffRatesScreenProps) {
  const [tab, setTab] = useState<TabId>("staff");

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "staff", label: "Staff", count: staff.length },
    { id: "services", label: "Services", count: services.length },
    { id: "deals", label: "Deals", count: deals.length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b" role="tablist">
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px min-h-10 border-b-2 px-3 text-sm",
              tab === id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground",
            )}
          >
            {label}
            <span className="ml-1 text-xs text-muted-foreground">{count}</span>
          </button>
        ))}
      </div>

      {tab === "staff" ? <StaffPanel staff={staff} /> : null}
      {tab === "services" ? <ServicesPanel services={services} /> : null}
      {tab === "deals" ? <DealsPanel deals={deals} services={services} /> : null}
    </div>
  );
}
