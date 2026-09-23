import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The scissors mark. It appears in the sidebar, in the drawer, on the bar
 * across the top of a phone and on the login screen, and it used to be typed
 * out at each of them with its own size and its own brass hex.
 */
export function BrandMark({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-xl bg-primary text-brass-bright shadow-sm ring-1 ring-brass/25",
        size === "sm" && "size-8 rounded-lg",
        size === "default" && "size-9.5",
        size === "lg" && "size-12",
      )}
    >
      <Scissors className={cn(size === "sm" && "size-4", size === "default" && "size-5", size === "lg" && "size-6")} />
    </span>
  );
}

/** The mark with the salon's name beside it. */
export function BrandLockup({ onDark = false, size = "default" }: { onDark?: boolean; size?: "sm" | "default" }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark size={size} />
      <div className="min-w-0 leading-tight">
        <p className={cn("truncate font-semibold", onDark && "text-sidebar-active-foreground")}>
          Art Men&apos;s Salon
        </p>
        <p className={cn("truncate text-xs", onDark ? "text-sidebar-heading" : "text-muted-foreground")}>
          POS &amp; Accounts
        </p>
      </div>
    </div>
  );
}
