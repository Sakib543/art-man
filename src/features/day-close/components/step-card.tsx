import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface StepCardProps {
  title: string;
  badge?: string;
  /** A short explanation under the content. */
  help?: ReactNode;
  error?: string;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  pending?: boolean;
}

/** The card around one Day Close step, with Back and Continue at the bottom. */
export function StepCard({ title, badge, help, error, children, onBack, onNext, nextLabel = "Continue", pending }: StepCardProps) {
  return (
    <div className="rounded-[14px] border bg-card">
      <div className="flex items-center justify-between gap-2.5 border-b px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {badge ? <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">{badge}</span> : null}
      </div>

      {children}

      {help || error ? (
        <div className="space-y-2 border-t px-[18px] py-3 text-[12.5px] text-muted-foreground">
          {help ? <p>{help}</p> : null}
          {error ? (
            <p role="alert" className="flex items-center gap-1.5 text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t px-[18px] py-3.5">
        {onBack ? (
          <Button variant="outline" className="h-10" onClick={onBack} disabled={pending}>
            <ArrowLeft aria-hidden />
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button className="h-10" onClick={onNext} disabled={pending}>
          {pending ? "Please wait..." : nextLabel}
          {pending ? null : <ArrowRight aria-hidden />}
        </Button>
      </div>
    </div>
  );
}
