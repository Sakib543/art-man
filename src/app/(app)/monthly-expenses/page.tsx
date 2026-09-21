import { ComingSoon } from "@/components/coming-soon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Monthly expenses | Art Men's Salon" };

export default async function Page() {
  await requireRole("owner");
  return <ComingSoon title="Monthly expenses" description="Rent, bills, supplies and other monthly costs." />;
}
