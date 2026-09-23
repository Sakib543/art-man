"use client";

import { AlertCircle } from "lucide-react";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/action-result";

interface FormDialogProps {
  open: boolean;
  title: string;
  description?: string;
  submitLabel?: string;
  onClose: () => void;
  /** Runs the save. The dialog closes on success and shows the error otherwise. */
  onSubmit: () => Promise<ActionResult<unknown>>;
  children: ReactNode;
}

/** A dialog around a form: handles the saving state, the error line and closing. */
export function FormDialog({ open, title, description, submitLabel = "Save", onClose, onSubmit, children }: FormDialogProps) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await onSubmit();
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          {children}

          {error ? (
            <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
