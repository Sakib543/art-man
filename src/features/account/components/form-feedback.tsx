import { AlertCircle, CheckCircle2 } from "lucide-react";

/** The error or success line under a settings form. */
export function FormFeedback({ error, done }: { error: string; done: string }) {
  if (error) {
    return (
      <p role="alert" className="flex items-center gap-1.5 text-[12.5px] text-destructive">
        <AlertCircle className="size-4 shrink-0" aria-hidden />
        {error}
      </p>
    );
  }
  if (done) {
    return (
      <p role="status" className="flex items-center gap-1.5 text-[12.5px] text-success">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden />
        {done}
      </p>
    );
  }
  return null;
}
