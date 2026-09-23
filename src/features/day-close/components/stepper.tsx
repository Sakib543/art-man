import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { panelClass } from "@/components/panel";

export const STEP_NAMES = ["Attendance", "Staff earnings", "Staff payments", "Cash count", "Review and close"] as const;

/** The five Day Close steps across the top. Names hide on phones, numbers stay. */
export function Stepper({ current }: { current: number }) {
  return (
    <ol className={cn(panelClass, "mb-4 flex items-center overflow-x-auto px-card py-3.5")}>
      {STEP_NAMES.map((name, index) => {
        const number = index + 1;
        const done = number < current;
        const active = number === current;
        return (
          <li key={name} className="flex flex-1 items-center last:flex-none" aria-current={active ? "step" : undefined}>
            <div className={cn("flex items-center gap-2 text-sm whitespace-nowrap", active ? "font-medium text-foreground" : done ? "text-foreground-soft" : "text-muted-foreground")}>
              <span
                className={cn(
                  "grid size-6.5 place-items-center rounded-full border-[1.5px] text-xs font-semibold",
                  done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-border bg-card",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : number}
              </span>
              <span className="hidden sm:inline">{name}</span>
            </div>
            {number < STEP_NAMES.length ? (
              <div className={cn("mx-3 h-[1.5px] min-w-5 flex-1", done ? "bg-primary" : "bg-border")} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
