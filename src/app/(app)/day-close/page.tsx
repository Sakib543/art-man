import { BusinessDayPill } from "@/components/business-day-pill";
import { PageHeader } from "@/components/page-header";
import { ClosedView } from "@/features/day-close/components/closed-view";
import { CloseWizard } from "@/features/day-close/components/close-wizard";
import { OpenFirstDay } from "@/features/day-close/components/open-first-day";
import { getDayCloseData } from "@/features/day-close/queries";
import { requireUser } from "@/lib/auth/session";
import { todayInKarachi } from "@/lib/business-date";
import { formatDateLong } from "@/lib/format";

export const metadata = { title: "Day close | Art Men's Salon" };

const SUBTITLE = "End-of-day cash check in five steps";

export default async function DayClosePage() {
  const user = await requireUser();
  const data = await getDayCloseData();

  if (data.state === "no-day") {
    return (
      <>
        <PageHeader title="Day close" subtitle={SUBTITLE} />
        {user.role === "owner" ? (
          <OpenFirstDay today={todayInKarachi()} />
        ) : (
          <p className="text-muted-foreground">No business day has been opened yet. Ask the Owner to open the first day.</p>
        )}
      </>
    );
  }

  if (data.state === "closed") {
    return (
      <>
        <PageHeader title="Day close" subtitle={SUBTITLE}>
          <div className="flex items-center gap-2.5 rounded-full border bg-card py-1.5 pr-2 pl-3 text-[13px] text-muted-foreground">
            <span>Business day: {formatDateLong(data.snapshot.businessDate)}</span>
            <span className="rounded-full bg-brass-soft px-2 py-0.5 text-xs font-medium text-brass-strong">Closed</span>
          </div>
        </PageHeader>
        <ClosedView snapshot={data.snapshot} />
        {user.role === "manager" ? (
          <p className="mt-3 text-[12.5px] text-muted-foreground">Only the Owner can reopen a closed day.</p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Day close" subtitle={SUBTITLE}>
        <BusinessDayPill businessDate={data.businessDate} />
      </PageHeader>
      <CloseWizard staff={data.staff} />
    </>
  );
}
