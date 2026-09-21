import { rs, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AccountRow } from "../types";

const th = "px-3.5 py-2 text-right text-[12.5px] font-medium text-muted-foreground";
const td = "px-3.5 py-2.5 text-right tabular-nums";

/** Every partner's account for the month, side by side. */
export function AccountsTable({ accounts }: { accounts: AccountRow[] }) {
  return (
    <div className="rounded-[14px] border bg-card">
      <div className="border-b px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">Partner accounts</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#fafbfc]">
              <th className={cn(th, "text-left")}>Partner</th>
              <th className={th}>Share</th>
              <th className={th}>Profit share</th>
              <th className={th}>Capital injected</th>
              <th className={th}>Repaid</th>
              <th className={th}>Capital owed</th>
              <th className={th}>Drawn</th>
              <th className={th}>Net position</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.partnerId} className="border-b last:border-b-0">
                <td className="px-3.5 py-2.5">{a.name}</td>
                <td className={td}>{a.sharePct}%</td>
                <td className={cn(td, a.profitShare < 0 && "text-destructive")}>{num(a.profitShare)}</td>
                <td className={td}>{num(a.injected)}</td>
                <td className={td}>{num(a.repaid)}</td>
                <td className={td}>{num(a.owed)}</td>
                <td className={td}>{num(a.drawn)}</td>
                <td className={cn(td, "font-semibold")}>{rs(a.netPosition)}</td>
              </tr>
            ))}
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No partners yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="border-t px-[18px] py-3 text-[12.5px] text-muted-foreground">
        Net position = profit share + capital still owed - drawn. It is what the business owes the partner.
      </p>
    </div>
  );
}
