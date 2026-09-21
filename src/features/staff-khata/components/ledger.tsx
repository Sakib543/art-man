import { Badge } from "@/components/ui/badge";
import { rs, formatDate, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { KhataStaff, LedgerRow } from "../queries";

const th = "px-3.5 py-2 text-left text-[12.5px] font-medium text-muted-foreground";
const td = "px-3.5 py-2.5";

/** One staff member's running account: earnings add, payments and advances subtract. */
export function Ledger({ member, rows }: { member: KhataStaff; rows: LedgerRow[] }) {
  return (
    <div className="rounded-[14px] border bg-card">
      <div className="flex items-center justify-between gap-2.5 border-b px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">{member.name}</h2>
        <Badge className="bg-warning-soft text-warning">Provisional until month close</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#fafbfc]">
              <th className={th}>Date</th>
              <th className={th}>Details</th>
              <th className={cn(th, "text-right")}>Amount</th>
              <th className={cn(th, "text-right")}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className={cn(td, "text-muted-foreground")}>{formatDate(row.businessDate)}</td>
                <td className={td}>{row.label}</td>
                <td
                  className={cn(
                    td,
                    "text-right tabular-nums",
                    row.amount > 0 && "text-success",
                    row.amount < 0 && "text-destructive",
                  )}
                >
                  {row.amount > 0 ? `+${num(row.amount)}` : num(row.amount)}
                </td>
                <td className={cn(td, "text-right tabular-nums")}>{num(row.balance)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Nothing in the khata yet
                </td>
              </tr>
            ) : null}
            <tr className="bg-[#fbf8f3] font-semibold">
              <td className={td} />
              <td className={td}>{member.balance < 0 ? `Advance taken by ${member.name}` : `Balance owed to ${member.name}`}</td>
              <td className={td} />
              <td className={cn(td, "text-right tabular-nums")}>{rs(member.balance)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="border-t px-[18px] py-3 text-[12.5px] text-muted-foreground">
        {member.payType === 3
          ? "Daily wage and commission are added every night at Day Close."
          : member.payType === 2
            ? `Commission is added every night at Day Close. Monthly salary of ${rs(member.salary)} is added at month end.`
            : `Monthly salary of ${rs(member.salary)} is added at month end.`}
      </p>
    </div>
  );
}
