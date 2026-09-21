import { Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BillingScreen } from "@/features/billing/components/billing-screen";
import { TodaysBills } from "@/features/billing/components/todays-bills";
import { getBillingData, getBillsForDay } from "@/features/billing/queries";
import { requireUser } from "@/lib/auth/session";
import { formatDateLong } from "@/lib/format";

export const metadata = { title: "Billing | Art Men's Salon" };

export default async function BillingPage() {
  await requireUser();
  const data = await getBillingData();

  if (!data) {
    return (
      <>
        <PageHeader title="Billing" subtitle="Create a bill and assign each service to a staff member" />
        <div className="flex items-start gap-2.5 rounded-[10px] border border-[#efe0c8] bg-brass-soft px-3.5 py-3 text-brass-strong">
          <Lock className="mt-0.5 size-[17px]" aria-hidden />
          <p>No business day is open. Ask the Owner to open the first business day.</p>
        </div>
      </>
    );
  }

  const bills = await getBillsForDay(data.businessDate);

  return (
    <>
      <PageHeader title="Billing" subtitle="Create a bill and assign each service to a staff member">
        <div className="flex items-center gap-2.5 rounded-full border bg-card py-1.5 pr-2 pl-3 text-[13px] text-muted-foreground">
          <span>Business day: {formatDateLong(data.businessDate)}</span>
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Open</span>
        </div>
      </PageHeader>
      <BillingScreen data={data} />
      <TodaysBills bills={bills} />
    </>
  );
}
