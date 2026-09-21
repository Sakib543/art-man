import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Daily folders | Art Men's Salon" };

export default async function Page() {
  await requireUser();
  return <ComingSoon title="Daily folders" description="Expenses, staff money, owner cash and online payments." />;
}
