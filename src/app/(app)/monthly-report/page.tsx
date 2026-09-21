import { ComingSoon } from "@/components/coming-soon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Monthly report | Art Men's Salon" };

export default async function Page() {
  await requireRole("owner");
  return <ComingSoon title="Monthly report" description="Sales, expenses, staff pay and net profit." />;
}
