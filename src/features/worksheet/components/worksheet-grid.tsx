import { Panel } from "@/components/panel";
import { Badge } from "@/components/ui/badge";
import { num, rs } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Sheet, SheetCell } from "../grid";

const head = "min-w-32 border-l px-3.5 py-2 text-right text-xs font-medium text-muted-foreground first:border-l-0";
const cellClass = "min-w-32 border-l px-3.5 py-2.5 align-top first:border-l-0";

function Cell({ cell }: { cell?: SheetCell }) {
  if (!cell) return null;
  return (
    <div className="text-right">
      <p
        className={cn(
          "font-medium tabular-nums",
          cell.status === "cancelled" && "text-muted-foreground line-through",
          cell.amount < 0 && "text-destructive",
        )}
      >
        {num(cell.amount)}
      </p>
      <p className="text-xs text-muted-foreground">
        #{cell.billNo} {cell.label}
      </p>
    </div>
  );
}

/**
 * The day's bills as the paper register draws them: a column per staff member,
 * totals at the bottom (spec 5.3).
 *
 * Read-only since P6.4. It used to take a "quick add" amount per column, which
 * saved a bill with no service, no customer and no receipt — a second way to
 * ring up a sale beside Billing, and one a counter used to the paper register
 * could use to enter the same sale twice. Bills are made on Billing only.
 *
 * It sits under the Daily report's summary cards, which already carry the
 * day's total, cash and online, so it does not repeat them.
 */
export function WorksheetGrid({ sheet }: { sheet: Sheet }) {
  return (
    <Panel>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-surface-sunken">
              {sheet.columns.map(({ staff }) => (
                <th key={staff.id} className={head}>
                  {staff.name} {!staff.active ? <Badge variant="secondary" className="ml-1">Inactive</Badge> : null}
                </th>
              ))}
              <th className={cn(head, "bg-brass-soft text-brass-strong")}>Owner / Account</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: sheet.rowCount }, (_, row) => (
              <tr key={row} className="border-b">
                {sheet.columns.map(({ staff, cells }) => (
                  <td key={staff.id} className={cellClass}>
                    <Cell cell={cells[row]} />
                  </td>
                ))}
                <td className={cn(cellClass, "bg-brass-soft")}>
                  <Cell cell={sheet.owner.cells[row]} />
                </td>
              </tr>
            ))}
            <tr className="bg-brass-tint font-semibold">
              {sheet.columns.map(({ staff, total }) => (
                <td key={staff.id} className={cn(cellClass, "text-right tabular-nums")}>
                  {rs(total)}
                </td>
              ))}
              <td className={cn(cellClass, "bg-brass-soft text-right tabular-nums")}>{rs(sheet.owner.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="border-t px-card py-3 text-xs text-muted-foreground">
        The staff columns add up to Total sales above. Owner / Account is the online part of that total, not extra.
        Cancelled amounts are struck through and their reversal shows in red.
      </p>
    </Panel>
  );
}
