import { Panel, PanelHeader } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { rs, formatDate, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { KhataStaff, LedgerRow } from "../queries";
import { GiveBonus } from "./give-bonus";

const th = "px-3.5 py-2 text-left text-xs font-medium text-muted-foreground";
// Padding from `md` up only; below it `.table-stacked` spaces each card
// itself, and a bare utility would beat it (HANDOFF 8.11).
const td = "md:px-3.5 md:py-2.5";

/** One staff member's running account: earnings add, payments and advances subtract. */
export function Ledger({
  member,
  rows,
  monthClosed,
  canGiveBonus,
}: {
  member: KhataStaff;
  rows: LedgerRow[];
  monthClosed: boolean;
  /** Only the Owner gives bonuses (spec §10.10), so only the Owner sees the button. */
  canGiveBonus: boolean;
}) {
  return (
    <Panel>
      <PanelHeader
        title={member.name}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            {monthClosed ? (
              <Badge variant="success">Final, month closed</Badge>
            ) : (
              <Badge variant="warning">Provisional until month close</Badge>
            )}
            {canGiveBonus && !monthClosed ? <GiveBonus staffId={member.id} staffName={member.name} /> : null}
          </div>
        }
      />

      <div className="md:overflow-x-auto">
        <table className="table-stacked w-full text-sm">
          <thead>
            <tr className="border-b bg-surface-sunken">
              <th className={th}>Date</th>
              <th className={th}>Details</th>
              <th className={cn(th, "text-right")}>Amount</th>
              <th className={cn(th, "text-right")}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className={cn(td, "text-muted-foreground")} data-label="Date">
                  {formatDate(row.businessDate)}
                </td>
                <td className={td} data-row-title="">
                  {row.label}
                </td>
                <td
                  className={cn(
                    td,
                    "text-right tabular-nums",
                    row.amount > 0 && "text-success",
                    row.amount < 0 && "text-destructive",
                  )}
                  data-label="Amount"
                >
                  {row.amount > 0 ? `+${num(row.amount)}` : num(row.amount)}
                </td>
                <td className={cn(td, "text-right tabular-nums")} data-label="Balance">
                  {num(row.balance)}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Nothing in the khata yet
                </td>
              </tr>
            ) : null}
            {/* The blank cells only line the figure up under Balance; on a
                phone they would be two empty lines in the card. */}
            <tr className="bg-brass-tint font-semibold">
              <td className={cn(td, "max-md:hidden")} />
              <td className={td}>{member.balance < 0 ? `Advance taken by ${member.name}` : `Balance owed to ${member.name}`}</td>
              <td className={cn(td, "max-md:hidden")} />
              <td className={cn(td, "text-right tabular-nums")}>{rs(member.balance)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="border-t px-card py-3 text-xs text-muted-foreground">
        {member.payType === 3
          ? "Daily wage and commission are added every night at Day Close."
          : member.payType === 2
            ? `Commission is added every night at Day Close. Monthly salary of ${rs(member.salary)} is added at month end.`
            : `Monthly salary of ${rs(member.salary)} is added at month end.`}
      </p>
    </Panel>
  );
}
