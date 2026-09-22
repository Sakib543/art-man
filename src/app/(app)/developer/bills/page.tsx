import { Search, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BillEditForm } from "@/features/developer/components/bill-edit-form";
import { findBillForEdit, listStaffForEdit, type BillEditBlock } from "@/features/developer/queries";
import { requireRole } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Edit a bill | Art Men's Salon" };

const BLOCKED: Record<BillEditBlock, string> = {
  "not-found": "There is no bill with that number.",
  reversal: "That is a reversal bill. It mirrors the bill it cancels, so edit that one instead.",
  cancelled: "That bill is cancelled. If it was corrected, edit the bill that replaced it.",
};

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive">
      <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
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
          <CardContent className="space-y-3 text-[13.5px] text-muted-foreground">
            <p>
              Everywhere else in this app a bill is fixed by cancelling it and entering a corrected
              one, and the database refuses anything else. This screen is the one exception, and it
              really does change the row.
            </p>
            <p>
              Use it only when the ordinary way will not do — usually a bill in a day that is
              already closed. The old and new figures go to the audit log either way, and a closed
              day is settled again, which changes its security code.
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
          <Button type="submit" variant="outline" className="h-10">
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
                  <p className="text-[15px] font-semibold">Bill #{lookup.bill.billNo}</p>
                  <p className="text-[13px] text-muted-foreground">
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
                <Warning>
                  This month is closed. Its report and the partners&apos; shares were frozen at the
                  time and are <strong>not</strong> recalculated, so they will no longer match the
                  bills. Fix that with an entry in the current month.
                </Warning>
              ) : null}

              <BillEditForm bill={lookup.bill} staff={staff} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
