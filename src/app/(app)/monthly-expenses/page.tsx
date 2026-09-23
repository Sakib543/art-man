import { Lock, ReceiptText, Wallet } from "lucide-react";
import { MonthSelect } from "@/components/month-select";
import { NoOpenDay } from "@/components/no-open-day";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { FixedLinesCard } from "@/features/monthly-expenses/components/fixed-lines-card";
import { OthersCard } from "@/features/monthly-expenses/components/others-card";
import { getExpensesData } from "@/features/monthly-expenses/queries";
import { requireRole } from "@/lib/auth/session";
import { rs } from "@/lib/format";

export const metadata = { title: "Monthly expenses | Art Men's Salon" };

const SUBTITLE = "Rent, bills and one-off expenses. Owner only.";

export default async function MonthlyExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireRole("owner");
  const { month } = await searchParams;
  const data = await getExpensesData(month);

  if (!data) {
    return (
      <>
        <PageHeader title="Monthly expenses" subtitle={SUBTITLE} />
        <NoOpenDay />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Monthly expenses" subtitle={`${data.monthLabel}. ${SUBTITLE}`}>
        <MonthSelect months={data.months} selected={data.month} basePath="/monthly-expenses" />
      </PageHeader>

      {data.closed ? (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-lg border border-brass-line bg-brass-soft px-3.5 py-3 text-sm text-brass-strong">
          <Lock className="mt-0.5 size-4.5 shrink-0" aria-hidden />
          <p>{data.monthLabel} is closed. Expenses are frozen.</p>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard icon={ReceiptText} label="Fixed monthly" value={rs(data.totals.fixed)} />
        <StatCard icon={Wallet} label="Others" value={rs(data.totals.others)} />
        <StatCard icon={ReceiptText} label="Monthly expenses total" value={rs(data.totals.total)} hint="Feeds the Monthly report" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <FixedLinesCard key={data.month} month={data.month} lines={data.fixed} total={data.totals.fixed} closed={data.closed} />
        <OthersCard month={data.month} rows={data.others} total={data.totals.others} closed={data.closed} />
      </div>
    </>
  );
}
