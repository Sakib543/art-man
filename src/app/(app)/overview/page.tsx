import { ComingSoon } from "@/components/coming-soon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Overview | Art Men's Salon" };

export default async function Page() {
  await requireRole("owner");
  return <ComingSoon title="Overview" description="Live status of the salon for the owner." />;
}
