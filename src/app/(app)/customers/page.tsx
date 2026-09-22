import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerCard } from "@/features/customers/components/customer-card";
import { CustomerList } from "@/features/customers/components/customer-list";
import { getCustomers } from "@/features/customers/queries";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Customers | Art Men's Salon" };

interface Params {
  q?: string;
  customer?: string;
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Params> }) {
  // Spec §10.4 keeps rates out of the counter's hands, so the whole screen is
  // the Owner's. The developer passes, as everywhere.
  await requireRole("owner");
  const { q = "", customer } = await searchParams;
  const data = await getCustomers(q, customer);

  return (
    <>
      <PageHeader title="Customers" subtitle="Their details, and the fixed prices that apply at billing" />

      <form method="get" className="mb-4 flex max-w-md items-center gap-2">
        <Input name="q" defaultValue={q} placeholder="Search by name or phone number" aria-label="Search customers" className="h-10" />
        <Button type="submit" variant="outline" className="h-10">
          <Search className="size-4" aria-hidden />
          Search
        </Button>
      </form>

      {data.list.length === 0 && !q ? (
        <p className="text-muted-foreground">No customers yet. They are added by their phone number on the Billing screen.</p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <CustomerList rows={data.list} selectedId={data.selected?.id} query={data.query} more={data.more} />
          {data.selected ? (
            <CustomerCard customer={data.selected} />
          ) : (
            <p className="text-muted-foreground">Choose a customer from the list.</p>
          )}
        </div>
      )}
    </>
  );
}
