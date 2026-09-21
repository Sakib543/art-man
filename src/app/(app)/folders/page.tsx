import { QrCode, UserRound, Users, Wallet } from "lucide-react";
import { BusinessDayPill } from "@/components/business-day-pill";
import { NoOpenDay } from "@/components/no-open-day";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EntriesTable } from "@/features/folders/components/entries-table";
import { EntryForm } from "@/features/folders/components/entry-form";
import { getFoldersData } from "@/features/folders/queries";
import { requireUser } from "@/lib/auth/session";
import { rs } from "@/lib/format";

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

  const { totals } = data;

  return (
    <>
      <PageHeader title="Daily folders" subtitle={SUBTITLE}>
        <BusinessDayPill businessDate={data.businessDate} />
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Expenses from drawer"
          value={rs(totals.expensesFromDrawer)}
          hint={`+ ${rs(totals.expensesFromOwner)} paid by Owner`}
        />
        <StatCard icon={Users} label="Staff advances" value={rs(totals.staffAdvances)} hint="Comes off the khata" />
        <StatCard
          icon={UserRound}
          label="Owner took cash"
          value={rs(totals.ownerTook)}
          hint={totals.ownerAdded ? `${rs(totals.ownerAdded)} added` : undefined}
        />
        <StatCard icon={QrCode} label="Online payments" value={rs(totals.onlineSales)} hint="Goes to Owner's bank" />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <EntriesTable entries={data.entries} online={data.online} />
        <EntryForm staff={data.staff} />
      </div>
    </>
  );
}
