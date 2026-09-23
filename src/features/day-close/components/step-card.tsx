import { Panel, PanelHeader } from "@/components/panel";
import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    <Panel>
      <PanelHeader title={title} action={badge ? <Badge variant="secondary">{badge}</Badge> : null} />

      {children}

      {help || error ? (
        <div className="space-y-2 border-t px-card py-3 text-xs text-muted-foreground">
          {help ? <p>{help}</p> : null}
          {error ? (
            <p role="alert" className="flex items-center gap-1.5 text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t px-card py-3.5">
        {onBack ? (
          <Button variant="outline" onClick={onBack} disabled={pending}>
            <ArrowLeft aria-hidden />
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={onNext} disabled={pending}>
          {pending ? "Please wait..." : nextLabel}
          {pending ? null : <ArrowRight aria-hidden />}
        </Button>
      </div>
    </Panel>
  );
}
