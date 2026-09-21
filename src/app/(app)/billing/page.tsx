import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Billing | Art Men's Salon" };

export default async function Page() {
  await requireUser();
  return <ComingSoon title="Billing" description="Services, customer, staff and payment for each bill." />;
}
