import { formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BusinessDayPillProps {
  businessDate: string;
  /** Defaults to open. */
  closed?: boolean;
}

/** "Business day: Monday, 21 Sep 2026  Open". Shown at the top of the counter screens. */
export function BusinessDayPill({ businessDate, closed = false }: BusinessDayPillProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-full border bg-card py-1.5 pr-2 pl-3 text-[13px] text-muted-foreground">
      <span>Business day: {formatDateLong(businessDate)}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-medium",
          closed ? "bg-brass-soft text-brass-strong" : "bg-success-soft text-success",
        )}
      >
        {closed ? "Closed" : "Open"}
      </span>
    </div>
  );
}
