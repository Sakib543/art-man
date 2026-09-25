import Link from "next/link";
import { cn } from "@/lib/utils";
import { reportHref, type ReportView } from "../view";

const VIEWS: { value: ReportView; label: string }[] = [
  { value: "list", label: "List" },
  { value: "register", label: "Register" },
];

/**
 * List or register. Links rather than buttons, so the choice lives in the URL
 * beside the date and the back button undoes it. Drawn like `Segmented`.
 */
export function ViewSwitch({ date, view }: { date: string; view: ReportView }) {
  return (
    <nav aria-label="How to show the day" className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-secondary p-1">
      {VIEWS.map((option) => {
        const selected = view === option.value;
        return (
          <Link
            key={option.value}
            href={reportHref(date, option.value)}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex min-h-9 items-center justify-center rounded-md px-3 text-sm transition-[background-color,box-shadow,color]",
              "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}
