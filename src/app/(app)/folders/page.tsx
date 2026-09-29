import { BusinessDayPill } from "@/components/business-day-pill";
import { NoOpenDay } from "@/components/no-open-day";
import { PageHeader } from "@/components/page-header";
import { FoldersScreen } from "@/features/folders/components/folders-screen";
import { getFoldersData } from "@/features/folders/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Daily folders | Art Men's Salon" };

const SUBTITLE = "Expenses, staff advances, Owner cash and online payments for today";

export default async function FoldersPage() {
  await requireUser();
  const data = await getFoldersData();

  if (!data) {
    return (
      <>
        <PageHeader title="Daily folders" subtitle={SUBTITLE} />
        <NoOpenDay />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Daily folders" subtitle={SUBTITLE}>
        <BusinessDayPill businessDate={data.businessDate} />
      </PageHeader>

      {/* The totals are worked out on the screen, with what is still on this computer (P2.2e). */}
      <FoldersScreen data={data} />
    </>
  );
}
