import { Panel } from "@/components/panel";
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
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-surface-sunken px-card py-3">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">{note}</p>
        <Button onClick={onAdd}>
          <Plus aria-hidden />
          {addLabel}
        </Button>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </Panel>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="success">Active</Badge>
  ) : (
    <Badge variant="secondary">Inactive</Badge>
  );
}

/** Shared table styling for the three panels. */
export const th = "px-3.5 py-2 text-left text-xs font-medium text-muted-foreground";
export const td = "px-3.5 py-2.5";
