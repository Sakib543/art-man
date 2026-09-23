import { CalendarDays } from "lucide-react";
import { formatDateLong } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BusinessDayPillProps {
  businessDate: string;
  /** Defaults to open. */
  closed?: boolean;
}

/**
 * "Business day: Monday, 21 Sep 2026 · Open". Shown at the top of the counter
 * screens. On a phone the words "Business day:" are dropped — the date and its
 * state are what matter, and the label cost half the width (P6.1).
 */
export function BusinessDayPill({ businessDate, closed = false }: BusinessDayPillProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border bg-card py-1.5 pr-1.5 pl-3 text-sm text-muted-foreground shadow-xs">
      <CalendarDays className="size-4 shrink-0 text-brass" aria-hidden />
      <span className="truncate">
        <span className="hidden sm:inline">Business day: </span>
        {formatDateLong(businessDate)}
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold",
          closed ? "border-brass-line bg-brass-soft text-brass-strong" : "border-success-line bg-success-soft text-success",
        )}
      >
        {closed ? "Closed" : "Open"}
      </span>
    </div>
  );
}
