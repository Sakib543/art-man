import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Daily worksheet | Art Men's Salon" };

export default async function Page() {
  await requireUser();
  return <ComingSoon title="Daily worksheet" description="One column per staff member, like the paper register." />;
}
