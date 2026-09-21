import { Banknote, QrCode, TrendingUp, Wallet } from "lucide-react";
import { BusinessDayPill } from "@/components/business-day-pill";
import { NoOpenDay } from "@/components/no-open-day";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ActivityFeed } from "@/features/overview/components/activity-feed";
import { AlertsCard } from "@/features/overview/components/alerts-card";
import { SalesChart } from "@/features/overview/components/sales-chart";
import { getOverview } from "@/features/overview/queries";
import { requireRole } from "@/lib/auth/session";
import { rs } from "@/lib/format";

export const metadata = { title: "Overview | Art Men's Salon" };

const SUBTITLE = "Live view of the salon, available on the Owner's phone";

export default async function OverviewPage() {
  await requireRole("owner");
  const data = await getOverview();

  if (!data) {
    return (
      <>
        <PageHeader title="Overview" subtitle={SUBTITLE} />
        <NoOpenDay />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Overview" subtitle={SUBTITLE}>
        <BusinessDayPill businessDate={data.businessDate} closed={data.closed} />
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label={data.closed ? "Sales (day closed)" : "Sales today"}
          value={rs(data.sale)}
          hint={`${data.paidBills} bill${data.paidBills === 1 ? "" : "s"} paid`}
        />
        <StatCard
          icon={Banknote}
          label={data.drawerCounted ? "Cash in drawer" : "Cash in drawer (expected)"}
          value={rs(data.drawerCash)}
          hint={data.drawerCounted ? "Counted at day close" : "Before day close"}
        />
        <StatCard icon={QrCode} label="Online to your bank" value={rs(data.online)} />
        <StatCard icon={Wallet} label="Expenses today" value={rs(data.expenses)} hint="Drawer and Owner-paid" />
      </div>

      <div className="mb-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <SalesChart days={data.chart} />
        <AlertsCard alerts={data.alerts} />
      </div>

      <ActivityFeed items={data.feed} />
    </>
  );
}
