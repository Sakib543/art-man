import { Panel, PanelHeader } from "@/components/panel";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Alert, AlertTone } from "../alerts";

const TONE: Record<AlertTone, { icon: typeof Info; box: string }> = {
  warn: { icon: AlertTriangle, box: "border-warning-line bg-warning-soft text-warning" },
  info: { icon: Info, box: "border-info-line bg-info-soft text-info" },
  good: { icon: CheckCircle2, box: "border-success-line bg-success-soft text-success" },
};

/** What the Owner should look at. An icon and words carry the meaning, never colour alone. */
export function AlertsCard({ alerts }: { alerts: Alert[] }) {
  const shown: Alert[] = alerts.length > 0 ? alerts : [{ id: "clear", tone: "good", text: "Nothing needs your attention." }];

  return (
    <Panel>
      <PanelHeader title="Alerts" />
      <ul className="space-y-2.5 px-card py-4">
        {shown.map((alert) => {
          const { icon: Icon, box } = TONE[alert.tone];
          return (
            <li key={alert.id} className={cn("flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm", box)}>
              <Icon className="mt-0.5 size-4.5 shrink-0" aria-hidden />
              <span>{alert.text}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
