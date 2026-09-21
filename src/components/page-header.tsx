import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-hand side, e.g. the business date or an action button. */
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[22px] leading-tight font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-[13.5px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
