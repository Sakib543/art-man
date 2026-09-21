import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}

export function StatCard({ icon: Icon, label, value, hint }: StatCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] border bg-card px-4 py-3.5">
      <div className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-secondary text-muted-foreground">
        <Icon className="size-[18px]" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[12.5px] text-muted-foreground">{label}</p>
        <p className="text-[22px] leading-tight font-semibold tracking-tight tabular-nums">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
