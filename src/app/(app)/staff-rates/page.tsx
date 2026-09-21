import { PageHeader } from "@/components/page-header";
import { StaffRatesScreen } from "@/features/staff-rates/components/staff-rates-screen";
import { getDealList, getServiceList, getStaffList } from "@/features/staff-rates/queries";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Staff & rates | Art Men's Salon" };

export default async function StaffRatesPage() {
  await requireRole("owner");
  const [staff, services, deals] = await Promise.all([getStaffList(), getServiceList(), getDealList()]);

  return (
    <>
      <PageHeader title="Staff & rates" subtitle="Staff pay, services and deals. Changes apply from now on." />
      <StaffRatesScreen staff={staff} services={services} deals={deals} />
    </>
  );
}
