import { ComingSoon } from "@/components/coming-soon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Staff & rates | Art Men's Salon" };

export default async function Page() {
  await requireRole("owner");
  return <ComingSoon title="Staff & rates" description="Staff pay, services, deals and special rates." />;
}
