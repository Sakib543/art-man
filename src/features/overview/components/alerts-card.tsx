import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Alert, AlertTone } from "../alerts";

const TONE: Record<AlertTone, { icon: typeof Info; box: string }> = {
  warn: { icon: AlertTriangle, box: "border-[#f3dfb2] bg-warning-soft text-warning" },
  info: { icon: Info, box: "border-[#d6e0f2] bg-info-soft text-info" },
  good: { icon: CheckCircle2, box: "border-[#c9e6d8] bg-success-soft text-success" },
};

/** What the Owner should look at. An icon and words carry the meaning, never colour alone. */
export function AlertsCard({ alerts }: { alerts: Alert[] }) {
  const shown: Alert[] = alerts.length > 0 ? alerts : [{ id: "clear", tone: "good", text: "Nothing needs your attention." }];

  return (
    <div className="rounded-[14px] border bg-card">
      <div className="border-b px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">Alerts</h2>
      </div>
      <ul className="space-y-2.5 px-[18px] py-4">
        {shown.map((alert) => {
          const { icon: Icon, box } = TONE[alert.tone];
          return (
            <li key={alert.id} className={cn("flex items-start gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-[13.5px]", box)}>
              <Icon className="mt-0.5 size-[17px] shrink-0" aria-hidden />
              <span>{alert.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
