import { Panel, PanelHeader } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import type { MonthChoice } from "@/db/queries/months";
import type { Rupees } from "@/lib/accounting";
import { rs, formatDate, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { KhataStaff, LedgerRow } from "../queries";
import { payNote } from "../rules";
import { GiveBonus } from "./give-bonus";
import { SalarySlip } from "./salary-slip";

const th = "px-3.5 py-2 text-left text-xs font-medium text-muted-foreground";
// Padding from `md` up only; below it `.table-stacked` spaces each card
// itself, and a bare utility would beat it (HANDOFF 8.11).
const td = "md:px-3.5 md:py-2.5";

/**
 * One month of a staff member's running account (P7.15): what was brought
 * forward, the month's lines — earnings add, payments and advances subtract —
 * and the balance at the month's end. The salary slip's shape, so the screen
 * stays one month long however many years the khata runs.
 */
export function Ledger({
  member,
  month,
  monthLabel,
  currentMonth,
  broughtForward,
  rows,
  closingBalance,
  monthClosed,
  canGiveBonus,
  months,
}: {
  member: KhataStaff;
  /** The month shown ("2026-09") and as it reads; null before the first business day. */
  month: string | null;
  monthLabel: string | null;
  /** The latest business day's month: its closing balance is the balance today. */
  currentMonth: boolean;
  broughtForward: Rupees;
  rows: LedgerRow[];
  closingBalance: Rupees;
  monthClosed: boolean;
  /** Only the Owner gives bonuses (spec §10.10), so only the Owner sees the button — on the current month. */
  canGiveBonus: boolean;
  /** The months a salary slip can be made for (P3.3), newest first. */
  months: MonthChoice[];
}) {
  // Before the first business day there is no month, and the balance is all there is.
  const closingLabel =
    month && !currentMonth
      ? `Balance at the end of ${monthLabel}`
      : closingBalance < 0
        ? `Advance taken by ${member.name}`
        : `Balance owed to ${member.name}`;

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
            <SalarySlip staffId={member.id} staffName={member.name} months={months} shownMonth={month} />
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
            {month ? (
              <tr className="border-b bg-surface-sunken text-muted-foreground">
                <td className={cn(td, "max-md:hidden")} />
                <td className={td}>Brought forward from before {monthLabel}</td>
                <td className={cn(td, "max-md:hidden")} />
                <td className={cn(td, "text-right tabular-nums")} data-label="Balance">
                  {num(broughtForward)}
                </td>
              </tr>
            ) : null}
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
                  {month ? `Nothing in the khata in ${monthLabel}` : "Nothing in the khata yet"}
                </td>
              </tr>
            ) : null}
            {/* The blank cells only line the figure up under Balance; on a
                phone they would be two empty lines in the card. */}
            <tr className="bg-brass-tint font-semibold">
              <td className={cn(td, "max-md:hidden")} />
              <td className={td}>{closingLabel}</td>
              <td className={cn(td, "max-md:hidden")} />
              <td className={cn(td, "text-right tabular-nums")}>{rs(closingBalance)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="border-t px-card py-3 text-xs text-muted-foreground">
        {month && !currentMonth ? `Balance today: ${rs(member.balance)}. ` : ""}
        {payNote(member.payType, member.salary)}
      </p>
    </Panel>
  );
}
