import type { LucideIcon } from "lucide-react";
import { Panel } from "@/components/panel";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  /**
   * What the figure means, when it means something (P6.1). The Overview's
   * four cards were four identical grey boxes and the eye had to read all of
   * them to find the one that mattered.
   */
  tone?: "neutral" | "success" | "warning" | "brass";
}

const TONE = {
  neutral: "bg-secondary text-muted-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  brass: "bg-brass-soft text-brass-strong",
} as const;

export function StatCard({ icon: Icon, label, value, hint, tone = "neutral" }: StatCardProps) {
  return (
    <Panel className="flex items-start gap-3 p-card transition-shadow hover:shadow-md">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", TONE[tone])}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-0.5 text-2xl leading-tight font-semibold tracking-tight tabular-nums">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </Panel>
  );
}
