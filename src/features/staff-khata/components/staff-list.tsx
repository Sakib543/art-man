import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PAY_TYPE_LABEL, paysCommission } from "@/lib/accounting";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { KhataStaff } from "../queries";
import { panelClass } from "@/components/panel";

const initials = (name: string) => name.slice(0, 2).toUpperCase();

/** Staff with their balance. Each row is a link, so the chosen person is in the URL. */
export function StaffList({ staff, selectedId }: { staff: KhataStaff[]; selectedId: string }) {
  return (
    <nav aria-label="Staff" className={cn(panelClass)}>
      {staff.map((member) => (
        <Link
          key={member.id}
          href={`/staff-khata?staff=${member.id}`}
          aria-current={member.id === selectedId ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-surface-sunken",
            member.id === selectedId && "bg-brass-soft hover:bg-brass-soft",
          )}
        >
          <span className="grid size-8.5 shrink-0 place-items-center rounded-full bg-brass-line text-sm font-semibold text-brass-strong">
            {initials(member.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{member.name}</span>
            <span className="block text-xs text-muted-foreground">
              {PAY_TYPE_LABEL[member.payType]}
              {paysCommission(member.payType) ? ` (${member.commissionRate}%)` : ""}
              {!member.active ? <Badge variant="secondary" className="ml-1.5">Inactive</Badge> : null}
            </span>
          </span>
          <span className={cn("font-semibold tabular-nums", member.balance < 0 && "text-destructive")}>{num(member.balance)}</span>
        </Link>
      ))}
    </nav>
  );
}
