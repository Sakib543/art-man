import { TicketPercent } from "lucide-react";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * "Discount 300" beside a bill, wherever a bill is listed (backlog P3.10).
 *
 * It has to be said out loud, because nothing else in a row shows it: the line
 * amounts and the cash are already net of the discount by design, so a bill
 * with Rs 300 off looks exactly like a cheaper bill.
 *
 * Shared by Today's bills and the Daily report so the two never drift apart —
 * a feature may not import another feature (`ARCHITECTURE.md` rule 5).
 * Deliberately quiet: muted text with a small icon, not a coloured badge. The
 * badges in these tables mean *status* (Paid, Cancelled, Edited), and a
 * discount is not a status.
 *
 * Renders nothing when there is no discount — including on a reversal bill,
 * which carries the negative of one.
 */
export function DiscountNote({
  amount,
  reason,
  className,
}: {
  amount: number;
  /** Shown on hover. Required at the counter, so it is nearly always there. */
  reason: string | null;
  className?: string;
}) {
  if (amount <= 0) return null;

  return (
    <span
      title={reason ?? undefined}
      className={cn("inline-flex items-center gap-1 text-[12px] text-muted-foreground", className)}
    >
      <TicketPercent className="size-3.5 shrink-0" aria-hidden />
      Discount {num(amount)}
    </span>
  );
}
