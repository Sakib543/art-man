import { Lock } from "lucide-react";
import { BusinessDayPill } from "@/components/business-day-pill";
import { PageHeader } from "@/components/page-header";
import { BillingScreen } from "@/features/billing/components/billing-screen";
import { TodaysBills } from "@/features/billing/components/todays-bills";
import { getBillingData, getBillsForDay } from "@/features/billing/queries";
import { requireUser } from "@/lib/auth/session";

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
        <BusinessDayPill businessDate={data.businessDate} />
      </PageHeader>
      <BillingScreen data={data} />
      <TodaysBills bills={bills} />
    </>
  );
}
