import { Badge } from "@/components/ui/badge";
import { formatDate, num, rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvestmentRow } from "../types";
import { RepayForm } from "./repay-form";

const th = "px-[18px] py-2 text-left text-[12.5px] font-medium text-muted-foreground";
const td = "px-[18px] py-2.5";

function Figure({ label, value, tone }: { label: string; value: string; tone?: "owed" | "clear" }) {
  return (
    <div
      className={cn(
        "rounded-[14px] border bg-card px-4 py-3",
        tone === "owed" && "border-[#f6d2cc] bg-danger-soft",
        tone === "clear" && "border-[#c9e6d8] bg-success-soft",
      )}
    >
      <p className={cn("text-[12.5px] text-muted-foreground", tone === "owed" && "text-destructive", tone === "clear" && "text-success")}>{label}</p>
      <p className={cn("text-[22px] font-semibold tracking-tight tabular-nums", tone === "owed" && "text-destructive", tone === "clear" && "text-success")}>{value}</p>
    </div>
  );
}

export function InvestmentCard({ investment }: { investment: InvestmentRow }) {
  const owed = investment.funders.filter((funder) => funder.remaining > 0);
  const outstanding = investment.remaining > 0;

  return (
    <div className="rounded-[14px] border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-[18px] py-3.5">
        <div>
          <h2 className="text-[15px] font-semibold">{investment.name}</h2>
          <p className="text-[12.5px] text-muted-foreground">Added {formatDate(investment.addedOn)}</p>
        </div>
        {outstanding ? (
          <Badge className="bg-warning-soft text-warning">Outstanding</Badge>
        ) : (
          <Badge className="bg-success-soft text-success">Fully repaid</Badge>
        )}
      </div>

      <div className="grid gap-3 px-[18px] py-4 sm:grid-cols-3">
        <Figure label="Total" value={rs(investment.total)} />
        <Figure label="Paid back" value={rs(investment.paid)} />
        <Figure label="Remaining" value={rs(investment.remaining)} tone={outstanding ? "owed" : "clear"} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y bg-[#fafbfc]">
              <th className={th}>Funded by</th>
              <th className={cn(th, "text-right")}>Contributed</th>
              <th className={cn(th, "text-right")}>Paid back</th>
              <th className={cn(th, "text-right")}>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {investment.funders.map((funder) => (
              <tr key={funder.partnerId} className="border-b">
                <td className={td}>{funder.partnerName}</td>
                <td className={cn(td, "text-right tabular-nums")}>{num(funder.contributed)}</td>
                <td className={cn(td, "text-right tabular-nums")}>{num(funder.repaid)}</td>
                <td className={cn(td, "text-right font-medium tabular-nums")}>{num(funder.remaining)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#fafbfc]">
              <th className={th}>Installment date</th>
              <th className={th}>Paid to</th>
              <th className={th}>Note</th>
              <th className={cn(th, "text-right")}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {investment.repayments.map((repayment) => (
              <tr key={repayment.id} className="border-b">
                <td className={cn(td, "text-muted-foreground")}>{formatDate(repayment.paidOn)}</td>
                <td className={td}>{repayment.partnerName}</td>
                <td className={td}>{repayment.note}</td>
                <td className={cn(td, "text-right tabular-nums")}>{num(repayment.amount)}</td>
              </tr>
            ))}
            {investment.repayments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No installments yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {owed.length > 0 ? <RepayForm capitalItemId={investment.id} owed={owed} nextNumber={investment.repayments.length + 1} /> : null}
    </div>
  );
}
