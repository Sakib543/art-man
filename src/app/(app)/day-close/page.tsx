import { BusinessDayPill } from "@/components/business-day-pill";
import { PageHeader } from "@/components/page-header";
import { CloseAttention } from "@/features/day-close/components/close-attention";
import { ClosedView } from "@/features/day-close/components/closed-view";
import { DayCloseScreen } from "@/features/day-close/components/day-close-screen";
import { OpenFirstDay } from "@/features/day-close/components/open-first-day";
import { getDayCloseData } from "@/features/day-close/queries";
import { atLeastOwner } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { todayInKarachi } from "@/lib/business-date";

export const metadata = { title: "Day close | Art Men's Salon" };

const SUBTITLE = "End-of-day cash check in five steps";

export default async function DayClosePage() {
  const user = await requireUser();
  const data = await getDayCloseData();

  if (data.state === "no-day") {
    return (
      <>
        <PageHeader title="Day close" subtitle={SUBTITLE} />
        {atLeastOwner(user.role) ? (
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
          <BusinessDayPill businessDate={data.snapshot.businessDate} closed />
        </PageHeader>
        {/* A close made offline and refused, for a day the server has closed already (P2.2f). */}
        <CloseAttention openDate={null} />
        <ClosedView snapshot={data.snapshot} canReopen={atLeastOwner(user.role)} />
        {user.role === "manager" ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Closed for the day. Only the Owner can reopen it, and only before the next day is started.
          </p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Day close" subtitle={SUBTITLE}>
        <BusinessDayPill businessDate={data.businessDate} />
      </PageHeader>
      {/* The five steps, unless this computer already closed the day or still holds some of it (P2.2f). */}
      <DayCloseScreen businessDate={data.businessDate} staff={data.staff} />
    </>
  );
}
