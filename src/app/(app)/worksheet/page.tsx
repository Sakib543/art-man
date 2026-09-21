import { BookOpen, Lock } from "lucide-react";
import Link from "next/link";
import { BusinessDayPill } from "@/components/business-day-pill";
import { NoOpenDay } from "@/components/no-open-day";
import { PageHeader } from "@/components/page-header";
import { WorksheetGrid } from "@/features/worksheet/components/worksheet-grid";
import { getWorksheetData } from "@/features/worksheet/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Daily worksheet | Art Men's Salon" };

const SUBTITLE = "The day's bills as a column per person, like the paper register";

export default async function WorksheetPage() {
  await requireUser();
  const data = await getWorksheetData();

  if (!data) {
    return (
      <>
        <PageHeader title="Daily worksheet" subtitle={SUBTITLE} />
        <NoOpenDay />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Daily worksheet" subtitle={SUBTITLE}>
        <BusinessDayPill businessDate={data.businessDate} closed={data.closed} />
      </PageHeader>

      <div className="mb-3.5 flex items-start gap-2.5 rounded-[10px] border border-[#efe0c8] bg-brass-soft px-3.5 py-3 text-[13.5px] text-brass-strong">
        <BookOpen className="mt-0.5 size-[17px] shrink-0" aria-hidden />
        <p>Each staff member has their own column, with the total at the bottom, just like the register.</p>
      </div>

      {data.closed ? (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-[10px] border border-[#d6e0f2] bg-info-soft px-3.5 py-3 text-[13.5px] text-info">
          <Lock className="mt-0.5 size-[17px] shrink-0" aria-hidden />
          <p>
            This day is closed, so quick add is off. Start the next business day from{" "}
            <Link href="/day-close" className="font-medium underline underline-offset-2">
              Day close
            </Link>
            .
          </p>
        </div>
      ) : null}

      <WorksheetGrid sheet={data.sheet} closed={data.closed} quickAddIds={data.quickAddIds} />
    </>
  );
}
