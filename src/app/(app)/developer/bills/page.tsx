import { Search, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BillEditForm } from "@/features/developer/components/bill-edit-form";
import { findBillForEdit, listStaffForEdit, type BillEditBlock, type MonthAdjustmentLine } from "@/features/developer/queries";
import { requireRole } from "@/lib/auth/session";
import { formatMonth, monthOf } from "@/lib/business-date";
import { formatDate, rs } from "@/lib/format";

export const metadata = { title: "Edit a bill | Art Men's Salon" };

const BLOCKED: Record<BillEditBlock, string> = {
  "not-found": "There is no bill with that number.",
  reversal: "That is a reversal bill. It mirrors the bill it cancels, so edit that one instead.",
  cancelled: "That bill is cancelled. If it was corrected, edit the bill that replaced it.",
};

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
      <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

/** "Sales were Rs 500 less than recorded (cash)": what an adjustment says, in one line. */
function adjustmentText(adjustment: MonthAdjustmentLine): string {
  const much = `${rs(Math.abs(adjustment.amount))} ${adjustment.amount >= 0 ? "more" : "less"} than recorded`;
  const who = adjustment.staffName ?? "A staff member";
  switch (adjustment.kind) {
    case "sale":
      return `Sales were ${much} (${adjustment.online ? "online" : "cash"})`;
    case "expense":
      return `Expenses were ${much}${adjustment.paidFrom === "owner" ? " (paid by the Owner)" : ""}`;
    case "staff_earning":
      return `${who} earned ${much}`;
    case "staff_taken":
      return `${who} took ${much}`;
  }
}

/**
 * The adjustments already recorded for a closed month (P3.4). A mistake one of
 * them put right, changed here as well, would count twice: in the month's
 * recalculated report and again where the adjustment counts (P1.10).
 */
function ClosedMonthAdjustments({ monthName, adjustments }: { monthName: string; adjustments: MonthAdjustmentLine[] }) {
  if (adjustments.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No adjustment has been recorded for {monthName}, so nothing changed here is counted twice.
      </p>
    );
  }

  return (
    <Warning>
      <p>
        {adjustments.length === 1 ? "An adjustment has" : `${adjustments.length} adjustments have`} already been
        recorded for {monthName}:
      </p>
      <ul className="list-disc space-y-0.5 pl-4">
        {adjustments.map((adjustment) => (
          <li key={adjustment.id}>
            {adjustmentText(adjustment)}, counted in {formatMonth(adjustment.countsIn)} — &ldquo;{adjustment.reason}&rdquo;
          </li>
        ))}
      </ul>
      <p>
        If the mistake you are fixing is one of these, do not change the bill as well: it would count twice, in{" "}
        {monthName}&apos;s recalculated report and again in the month the adjustment counts in. Cancel the adjustment
        first, from that month&apos;s Monthly report while it is open, or leave the bill as it is.
      </p>
    </Warning>
  );
}

export default async function EditBillPage({ searchParams }: { searchParams: Promise<{ bill?: string }> }) {
  await requireRole("developer");
  const { bill: asked } = await searchParams;
  const billNo = Number(asked);

  const lookup = asked && Number.isInteger(billNo) && billNo > 0 ? await findBillForEdit(billNo) : null;
  const staff = lookup?.bill ? await listStaffForEdit() : [];

  return (
    <>
      <PageHeader title="Edit a bill" subtitle="Change a bill in place, on any day" />

      <div className="max-w-3xl space-y-4">
        <Card>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Everywhere else in this app a bill is fixed by cancelling it and entering a corrected
              one, and the database refuses anything else. This screen is the one exception, and it
              really does change the row.
            </p>
            <p>
              Use it only when the ordinary way will not do — usually a bill in a day that is
              already closed. The old and new figures go to the audit log either way, and a closed
              day is settled again, which changes its security code. In a closed month, the
              month&apos;s report and the partners&apos; shares are worked out again as well.
            </p>
          </CardContent>
        </Card>

        <form method="get" className="flex items-end gap-2">
          <div className="w-40">
            <label htmlFor="bill" className="mb-1.5 block text-sm font-medium">
              Bill number
            </label>
            <Input id="bill" name="bill" inputMode="numeric" defaultValue={asked ?? ""} className="h-10" />
          </div>
          <Button type="submit" variant="outline">
            <Search aria-hidden />
            Find
          </Button>
        </form>

        {lookup?.block ? <Warning>{BLOCKED[lookup.block]}</Warning> : null}

        {lookup?.bill ? (
          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <p className="text-md font-semibold">Bill #{lookup.bill.billNo}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(lookup.bill.businessDate)} · entered by {lookup.bill.createdBy}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={lookup.bill.dayClosed ? "destructive" : "secondary"}>
                    {lookup.bill.dayClosed ? "Day closed" : "Day open"}
                  </Badge>
                  {lookup.bill.monthClosed ? <Badge variant="destructive">Month closed</Badge> : null}
                </div>
              </div>

              {lookup.bill.dayClosed ? (
                <Warning>
                  This day is closed. Saving will settle it again: the commissions it posted are
                  reversed and posted afresh, and a new closing record is written with a new
                  security code. The old one is kept in full.
                </Warning>
              ) : null}

              {lookup.bill.monthClosed ? (
                <>
                  <Warning>
                    {formatMonth(monthOf(lookup.bill.businessDate))} is closed. Saving works its report
                    and the partners&apos; shares out again from the corrected days; the salaries and
                    the share percentages stay as the month closed with them. The Owner sees a note
                    on its Monthly report that it was recalculated after this bill was corrected — not
                    who corrected it.
                  </Warning>
                  <ClosedMonthAdjustments
                    monthName={formatMonth(monthOf(lookup.bill.businessDate))}
                    adjustments={lookup.bill.adjustments}
                  />
                </>
              ) : null}

              <BillEditForm bill={lookup.bill} staff={staff} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
