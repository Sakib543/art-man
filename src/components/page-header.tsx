import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-hand side, e.g. the business date or an action button. */
  children?: ReactNode;
}

/**
 * The top of every screen. On a phone the title and whatever sits beside it
 * stack rather than fighting over one line — the business-day pill and a
 * twenty-character heading do not share 375px (P6.1).
 */
export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl leading-tight font-semibold tracking-tight text-balance">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground text-pretty">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
