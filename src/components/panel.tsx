import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The look, on its own, for the handful of panels that have to be a `<form>`,
 * a `<nav>` or an `<ol>` rather than a `<section>`. Same source of truth.
 */
export const panelClass = "overflow-hidden rounded-xl border bg-card shadow-sm";

/**
 * The box almost every screen in this app is made of (P6.1).
 *
 * It existed forty-nine times as `rounded-[14px] border bg-card` typed out by
 * hand, each with its own header markup, and they had already drifted: four
 * different header paddings, headers with the title in a `<div>` and headers
 * with it in a `<h2>`, some with a bottom border and some without. Nothing
 * about a card could be changed in one place, which is why none of them had a
 * shadow.
 *
 * `Card` in `components/ui/` is the shadcn primitive and was never used by
 * this app. This is the one the screens want: a header with a title, an
 * optional line under it, and something on the right.
 */
export function Panel({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="panel"
      className={cn(panelClass, className)}
      {...props}
    >
      {children}
    </section>
  );
}

interface PanelHeaderProps {
  title: ReactNode;
  /** A line under the title, for what the screen cannot say in the title. */
  description?: ReactNode;
  icon?: LucideIcon;
  /** The right-hand side: a count, a badge, a button. */
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function PanelHeader({ title, description, icon: Icon, action, className, children }: PanelHeaderProps) {
  return (
    <div
      data-slot="panel-header"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b bg-surface-sunken px-card py-3.5",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brass-soft text-brass-strong">
            <Icon className="size-4.5" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-md leading-snug font-semibold">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {action ?? children}
    </div>
  );
}

export function PanelBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="panel-body" className={cn("px-card py-4", className)} {...props} />;
}

export function PanelFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-footer"
      className={cn("flex flex-wrap items-center gap-3 border-t bg-surface-sunken px-card py-3", className)}
      {...props}
    />
  );
}

/** What a list shows when it has nothing in it. */
export function PanelEmpty({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("px-card py-10 text-center text-muted-foreground", className)} {...props} />;
}
