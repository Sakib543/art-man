import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Day close | Art Men's Salon" };

export default async function Page() {
  await requireUser();
  return <ComingSoon title="Day close" description="Count the cash, explain any difference and lock the day." />;
}
