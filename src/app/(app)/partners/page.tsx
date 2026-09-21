import { ComingSoon } from "@/components/coming-soon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Partners | Art Men's Salon" };

export default async function Page() {
  await requireRole("owner");
  return <ComingSoon title="Partners" description="Profit share, capital and net position for each partner." />;
}
