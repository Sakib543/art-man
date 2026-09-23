import { PowerOff } from "lucide-react";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/app-shell/sign-out-button";
import { Card, CardContent } from "@/components/ui/card";
import { readMaintenance } from "@/db/app-settings";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Closed | Art Men's Salon" };

/**
 * Where `requireUser` sends the owner and the manager while the site is off.
 * It deliberately does NOT call `requireUser` itself — that would bounce it
 * back here for ever.
 */
export default async function MaintenancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "developer") redirect("/developer/maintenance");

  const { on, changedAt } = await readMaintenance();
  if (!on) redirect("/billing");

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-primary text-brass-bright">
            <PowerOff className="size-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold">The system is closed</h1>
            <p className="text-sm text-muted-foreground">Maintenance is in progress</p>
          </div>
        </div>
        <Card>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Billing, day close and the reports are switched off for a short while. Nothing has
              been lost — everything already entered is safe.
            </p>
            <p>Use the paper bill book until this screen goes away, then enter those bills.</p>
            {changedAt ? (
              <p className="text-xs">
                Switched off at {formatDateTime(changedAt)}.
              </p>
            ) : null}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-xs">Signed in as {user.name}</span>
              <SignOutButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
