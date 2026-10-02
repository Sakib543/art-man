"use client";

import { AlertCircle } from "lucide-react";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { thrownSaveMessage } from "@/components/use-save-id";
import type { ActionResult } from "@/lib/action-result";

interface FormDialogProps {
  open: boolean;
  title: string;
  description?: string;
  submitLabel?: string;
  /** The button that closes it unsaved. "Cancel", unless the form itself cancels something. */
  cancelLabel?: string;
  onClose: () => void;
  /** Runs the save. The dialog closes on success and shows the error otherwise. */
  onSubmit: () => Promise<ActionResult<unknown>>;
  /** The save carries a save id (P7.2), so pressing again after a dropped connection is safe to suggest. */
  savesOnce?: boolean;
  children: ReactNode;
}

/** A dialog around a form: handles the saving state, the error line and closing. */
export function FormDialog({
  open,
  title,
  description,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  onClose,
  onSubmit,
  savesOnce = false,
  children,
}: FormDialogProps) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      let result;
      try {
        result = await onSubmit();
      } catch (thrown) {
        return setError(thrownSaveMessage(thrown, savesOnce));
      }
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
              {cancelLabel}
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
