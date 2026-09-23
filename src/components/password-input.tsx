"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A password box with an eye to read it back.
 *
 * Every password and PIN in this app is typed blind, twice, and confirmed
 * against itself — and a mistyped one is only discovered at the next sign-in,
 * by which point nobody knows which of the two boxes was wrong. The eye is the
 * cheapest fix: the person checks what they typed before they commit to it.
 *
 * It replaces `type="password"` with `type="text"` rather than doing anything
 * cleverer, so a password manager still sees an ordinary field. The toggle is
 * a `type="button"`, or it would submit the form it sits in.
 */
export function PasswordInput({ className, ...props }: ComponentProps<"input">) {
  const [shown, setShown] = useState(false);
  // A stable id so the button can describe which field it belongs to even
  // when the field has no visible label of its own.
  const fallbackId = useId();
  const fieldId = props.id ?? fallbackId;

  return (
    <div className="relative">
      <Input
        {...props}
        id={fieldId}
        type={shown ? "text" : "password"}
        // Room for the button, so a long password never runs under it.
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setShown((value) => !value)}
        aria-label={shown ? "Hide the password" : "Show the password"}
        aria-pressed={shown}
        aria-controls={fieldId}
        // -1: the eye is a convenience, and tabbing from the field should
        // reach the next field or the submit button, not this.
        tabIndex={-1}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {shown ? <EyeOff className="size-4.5" aria-hidden /> : <Eye className="size-4.5" aria-hidden />}
      </button>
    </div>
  );
}
