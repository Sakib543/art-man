import { Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Ledger } from "@/features/staff-khata/components/ledger";
import { StaffList } from "@/features/staff-khata/components/staff-list";
import { getKhataData } from "@/features/staff-khata/queries";
import { atLeastOwner } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Staff khata | Art Men's Salon" };

const SUBTITLE = "Earnings are added, payments and advances are subtracted";

export default async function StaffKhataPage({ searchParams }: { searchParams: Promise<{ staff?: string }> }) {
  const user = await requireUser();
  const { staff } = await searchParams;
  const data = await getKhataData(staff);

  if (!data) {
    return (
      <>
        <PageHeader title="Staff khata" subtitle={SUBTITLE} />
        <p className="text-muted-foreground">No staff yet. The Owner adds staff in Staff &amp; rates.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Staff khata" subtitle={SUBTITLE} />

      <div className="mb-3.5 flex items-start gap-2.5 rounded-[10px] border border-[#d6e0f2] bg-info-soft px-3.5 py-3 text-[13.5px] text-info">
        <Info className="mt-0.5 size-[17px] shrink-0" aria-hidden />
        <p>Today&apos;s earnings and payments are added to the khata when the day is closed.</p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <StaffList staff={data.staff} selectedId={data.selected.id} />
        <Ledger
          member={data.selected}
          rows={data.ledger}
          monthClosed={data.monthClosed}
          canGiveBonus={atLeastOwner(user.role)}
        />
      </div>
    </>
  );
}
