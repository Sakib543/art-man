import { Panel, PanelHeader, panelClass } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { formatDate, num, rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvestmentRow } from "../types";
import { RepayForm } from "./repay-form";

const th = "px-card py-2 text-left text-xs font-medium text-muted-foreground";
const td = "px-card py-2.5";

function Figure({ label, value, tone }: { label: string; value: string; tone?: "owed" | "clear" }) {
  return (
    <div
      className={cn(
        panelClass, "px-4 py-3",
        tone === "owed" && "border-danger-line bg-danger-soft",
        tone === "clear" && "border-success-line bg-success-soft",
      )}
    >
      <p className={cn("text-xs text-muted-foreground", tone === "owed" && "text-destructive", tone === "clear" && "text-success")}>{label}</p>
      <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", tone === "owed" && "text-destructive", tone === "clear" && "text-success")}>{value}</p>
    </div>
  );
}

export function InvestmentCard({ investment }: { investment: InvestmentRow }) {
  const owed = investment.funders.filter((funder) => funder.remaining > 0);
  const outstanding = investment.remaining > 0;

  return (
    <Panel>
      <PanelHeader
        title={investment.name}
        description={`Added ${formatDate(investment.addedOn)}`}
        action={
          outstanding ? <Badge variant="warning">Outstanding</Badge> : <Badge variant="success">Fully repaid</Badge>
        }
      />

      <div className="grid gap-3 px-card py-4 sm:grid-cols-3">
        <Figure label="Total" value={rs(investment.total)} />
        <Figure label="Paid back" value={rs(investment.paid)} />
        <Figure label="Remaining" value={rs(investment.remaining)} tone={outstanding ? "owed" : "clear"} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y bg-surface-sunken">
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
            <tr className="border-b bg-surface-sunken">
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
    </Panel>
  );
}
