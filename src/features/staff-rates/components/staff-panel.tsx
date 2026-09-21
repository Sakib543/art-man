"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PAY_TYPE_LABEL } from "@/lib/accounting";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StaffRow } from "../types";
import { ActiveBadge, PanelCard, td, th } from "./panel-card";
import { StaffForm } from "./staff-form";

export function StaffPanel({ staff }: { staff: StaffRow[] }) {
  // undefined = closed, null = adding, a row = editing that row.
  const [editing, setEditing] = useState<StaffRow | null | undefined>(undefined);

  return (
    <>
      <PanelCard
        addLabel="Add staff"
        onAdd={() => setEditing(null)}
        note="Make a staff member inactive instead of deleting: their past bills and khata stay intact."
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#fafbfc]">
              <th className={th}>Name</th>
              <th className={th}>Pay type</th>
              <th className={cn(th, "text-right")}>Salary</th>
              <th className={cn(th, "text-right")}>Daily wage</th>
              <th className={cn(th, "text-right")}>Commission</th>
              <th className={th}>Status</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id} className={cn("border-b last:border-b-0", !member.active && "text-muted-foreground")}>
                <td className={cn(td, "font-medium")}>{member.name}</td>
                <td className={td}>{PAY_TYPE_LABEL[member.payType]}</td>
                <td className={cn(td, "text-right tabular-nums")}>{member.salary ? num(member.salary) : "-"}</td>
                <td className={cn(td, "text-right tabular-nums")}>{member.dailyWage ? num(member.dailyWage) : "-"}</td>
                <td className={cn(td, "text-right tabular-nums")}>{member.commissionRate ? `${member.commissionRate}%` : "-"}</td>
                <td className={td}>
                  <ActiveBadge active={member.active} />
                </td>
                <td className={cn(td, "text-right")}>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(member)}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
            {staff.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No staff yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </PanelCard>

      {editing !== undefined ? (
        <StaffForm key={editing?.id ?? "new"} staff={editing} open onClose={() => setEditing(undefined)} />
      ) : null}
    </>
  );
}
