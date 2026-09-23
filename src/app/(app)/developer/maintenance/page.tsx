import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MaintenanceToggle } from "@/features/developer/components/maintenance-toggle";
import { getMaintenance } from "@/features/developer/queries";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Maintenance | Art Men's Salon" };

export default async function MaintenancePage() {
  await requireRole("developer");
  const { on, changedAt, changedBy } = await getMaintenance();

  return (
    <>
      <PageHeader title="Maintenance" subtitle="Take the site down, and bring it back up">
        <Badge variant={on ? "destructive" : "secondary"}>{on ? "Closed" : "Open"}</Badge>
      </PageHeader>

      <Card className="max-w-2xl">
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {on
              ? "The Owner and the Manager see a closed screen instead of the app. You still have the run of it, which is how you switch the site back on."
              : "Everyone can use the app. Closing it stops billing, day close and every report at once — the counter falls back to the paper bill book."}
          </p>
          <p className="text-sm text-muted-foreground">
            Nothing already entered is touched either way. The switch is checked on every page and
            every action, so it takes effect at once, without anyone signing out.
          </p>

          <MaintenanceToggle on={on} />

          {changedAt ? (
            <p className="border-t pt-3 text-xs text-muted-foreground">
              Last changed by {changedBy ?? "someone"} on {formatDateTime(changedAt)}.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
