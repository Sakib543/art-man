import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getDayBills } from "@/db/queries/day-bills";
import { BusinessDayPill } from "@/components/business-day-pill";
import { NoOpenDay } from "@/components/no-open-day";
import { PageHeader } from "@/components/page-header";
import { BillingScreen } from "@/features/billing/components/billing-screen";
import { NeedsAttention } from "@/features/billing/components/needs-attention";
import { PendingBills } from "@/features/billing/components/pending-bills";
import { TodaysBills } from "@/features/billing/components/todays-bills";
import { getBillForEdit, getBillingData } from "@/features/billing/queries";
import { atLeastOwner } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Billing | Art Men's Salon" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; fix?: string }>;
}) {
  const user = await requireUser();
  const data = await getBillingData();

  if (!data) {
    return (
      <>
        <PageHeader title="Billing" subtitle="Create a bill and assign each service to a staff member" />
        <NeedsAttention fixing={null} />
        <NoOpenDay />
      </>
    );
  }

  // Correcting a bill is the Owner's alone, so a manager's ?edit= is ignored.
  const { edit, fix } = await searchParams;
  const draft = edit && atLeastOwner(user.role) ? await getBillForEdit(edit, data) : null;
  const editing = draft?.ok ? draft : null;
  // A bill made offline and refused by the server, opened to be put right
  // (P2.2c). It lives in this browser's outbox, not in the database, so the
  // screen reads it from there; the page only passes its id along.
  const fixing = !editing && fix ? fix : null;

  const bills = await getDayBills(data.businessDate);

  return (
    <>
      <PageHeader title="Billing" subtitle="Create a bill and assign each service to a staff member">
        <BusinessDayPill businessDate={data.businessDate} />
      </PageHeader>

      {draft && !draft.ok ? (
        <div className="mb-3.5 flex items-start gap-2.5 rounded-lg border border-warning-line bg-warning-soft px-3.5 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4.5 shrink-0" aria-hidden />
          <p>
            {draft.reason}{" "}
            <Link href="/billing" className="underline underline-offset-2">
              Start a new bill instead
            </Link>
            .
          </p>
        </div>
      ) : null}

      <NeedsAttention fixing={fixing} />

      {/* A new key resets the cart when a different bill is opened for correction. */}
      <BillingScreen
        key={editing?.id ?? (fixing ? `fix:${fixing}` : "new")}
        data={data}
        editing={editing}
        fixing={fixing}
      />
      {/* Bills made with no internet, until the server has them (P2.2d). */}
      <PendingBills className="mt-4" />
      <TodaysBills
        bills={bills}
        businessDate={data.businessDate}
        canEdit={atLeastOwner(user.role)}
        editingId={editing?.id ?? null}
      />
    </>
  );
}
