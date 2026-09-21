import type { ReactNode } from "react";
import { Sidebar } from "@/components/app-shell/sidebar";
import { requireUser } from "@/lib/auth/session";

/**
 * Shell for every signed-in screen. It needs the user for the sidebar; each
 * page still does its own role check next to its data (layouts do not re-run
 * on client navigation).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="grid min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
      <Sidebar user={user} />
      <main className="min-w-0 px-4 pt-[18px] pb-24 lg:px-7 lg:pt-[22px]">{children}</main>
    </div>
  );
}
