"use client";

import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  /** Named for a screen reader, since the group itself carries no label. */
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  /** 36px reads as a form control; 44px is the counter's main choice. */
  size?: "default" | "lg";
  className?: string;
}

/**
 * Pick one of two or three (P6.1).
 *
 * It was written out three times — the payment mode on a bill, what an expense
 * was paid from, and the worksheet's quick-add — with the same markup and
 * three different button heights. The selected pill is `bg-card` on
 * `bg-secondary`, so it works the same way the app's other surfaces do.
 */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  size = "default",
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-secondary p-1", className)}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md px-2 text-sm transition-[background-color,box-shadow,color]",
              "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              size === "lg" ? "min-h-11" : "min-h-9",
              selected
                ? "bg-card font-semibold text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
