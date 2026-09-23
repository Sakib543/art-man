import { Lock } from "lucide-react";
import Link from "next/link";

/** Shown on counter screens when no business day is open (before the first day, or after Day Close). */
export function NoOpenDay() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-brass-line bg-brass-soft px-3.5 py-3 text-brass-strong">
      <Lock className="mt-0.5 size-4.5 shrink-0" aria-hidden />
      <p>
        No business day is open. Start the next business day from{" "}
        <Link href="/day-close" className="font-medium underline underline-offset-2">
          Day close
        </Link>
        .
      </p>
    </div>
  );
}
