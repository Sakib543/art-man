import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PanelCardProps {
  addLabel: string;
  onAdd: () => void;
  note?: string;
  children: ReactNode;
}

/** The card around a table on Staff & rates, with its "Add" button. */
export function PanelCard({ addLabel, onAdd, note, children }: PanelCardProps) {
  return (
    <div className="rounded-[14px] border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-[18px] py-3">
        <p className="text-[13px] text-muted-foreground">{note}</p>
        <Button className="h-9" onClick={onAdd}>
          <Plus aria-hidden />
          {addLabel}
        </Button>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className="bg-success-soft text-success">Active</Badge>
  ) : (
    <Badge className="bg-secondary text-muted-foreground">Inactive</Badge>
  );
}

/** Shared table styling for the three panels. */
export const th = "px-3.5 py-2 text-left text-[12.5px] font-medium text-muted-foreground";
export const td = "px-3.5 py-2.5";
