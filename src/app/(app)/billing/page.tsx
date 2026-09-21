import { BusinessDayPill } from "@/components/business-day-pill";
import { NoOpenDay } from "@/components/no-open-day";
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
        <NoOpenDay />
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
