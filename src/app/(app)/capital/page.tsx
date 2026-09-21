import { ComingSoon } from "@/components/coming-soon";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Capital / Outstanding | Art Men's Salon" };

export default async function Page() {
  await requireRole("owner");
  return <ComingSoon title="Capital / Outstanding" description="Partner-funded investments and their repayments." />;
}
