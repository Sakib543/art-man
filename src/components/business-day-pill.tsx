import { formatDateLong } from "@/lib/format";

/** "Business day: Monday, 21 Sep 2026  Open". Shown at the top of the counter screens. */
export function BusinessDayPill({ businessDate }: { businessDate: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-full border bg-card py-1.5 pr-2 pl-3 text-[13px] text-muted-foreground">
      <span>Business day: {formatDateLong(businessDate)}</span>
      <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Open</span>
    </div>
  );
}
