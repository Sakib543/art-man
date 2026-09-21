import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Daily report | Art Men's Salon" };

export default async function Page() {
  await requireUser();
  return <ComingSoon title="Daily report" description="Sales, expenses and profit for a closed day." />;
}
