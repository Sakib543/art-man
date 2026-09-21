import { ComingSoon } from "@/components/coming-soon";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Staff khata | Art Men's Salon" };

export default async function Page() {
  await requireUser();
  return <ComingSoon title="Staff khata" description="Each staff member's running account." />;
}
