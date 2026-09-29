import type { DayBill } from "@/db/queries/day-bills";
import type { Rupees } from "@/lib/accounting";
import { waitingBills, type OutboxItem } from "@/lib/offline/outbox";

/**
 * The daily worksheet: the day's bills laid out like the paper register, one
 * column per staff member plus an "Owner / Account" column for online money.
 * It is only a view of the bills, not a separate ledger.
 *
 * Since P2.2e it also draws the bills made offline that are still on this
 * computer, after the server's, marked as not sent yet.
 */

export interface SheetStaff {
  id: string;
  name: string;
  active: boolean;
}

export interface SheetCell {
  /** Negative on a reversal. */
  amount: Rupees;
  /** "#41", or the number on the slip (`T-3`) of a bill still on this computer. */
  ref: string;
  label: string;
  status: DayBill["status"];
  /** Made offline and not on the server yet (P2.2e). */
  pending: boolean;
}

export interface SheetColumn {
  staff: SheetStaff;
  cells: SheetCell[];
  /** Net of cancelled bills and their reversals. */
  total: Rupees;
}

export interface Sheet {
  columns: SheetColumn[];
  owner: { cells: SheetCell[]; total: Rupees };
  /** How many rows the tallest column needs. */
  rowCount: number;
  /** All staff columns together. Matches the day's total sales. */
  grandTotal: Rupees;
  cashSales: Rupees;
  onlineSales: Rupees;
  /** The bills made offline among them, which the server's day figures do not have yet (P2.2e). */
  pending: { count: number; total: Rupees };
}

/**
 * A bill made offline and still on this computer (P2.2e), as the register
 * draws it: always active — it cannot have been cancelled before the server
 * even has it.
 */
export interface PendingBill {
  /** The number on its slip: `T-3`, or the paper book's. */
  slip: string;
  lines: { staffId: string; name: string; amount: Rupees }[];
  cash: Rupees;
  online: Rupees;
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** Bills come newest first; the register reads oldest first, and a bill still on this computer comes last. */
export function buildSheet(bills: DayBill[], staff: SheetStaff[], pending: PendingBill[] = []): Sheet {
  const ordered = [...bills].sort((a, b) => a.billNo - b.billNo);
  const rows = [
    ...ordered.map((bill) => ({
      ref: `#${bill.billNo}`,
      status: bill.status,
      lines: bill.lines,
      online: bill.online,
      pending: false,
    })),
    ...pending.map((bill) => ({
      ref: bill.slip,
      status: "active" as const,
      lines: bill.lines,
      online: bill.online,
      pending: true,
    })),
  ];

  const columns = staff.map<SheetColumn>((member) => {
    const cells = rows.flatMap((bill) =>
      bill.lines
        .filter((line) => line.staffId === member.id)
        .map<SheetCell>((line) => ({
          amount: line.amount,
          ref: bill.ref,
          label: line.name,
          status: bill.status,
          pending: bill.pending,
        })),
    );
    return { staff: member, cells, total: sum(cells.map((cell) => cell.amount)) };
  });

  const ownerCells = rows
    .filter((bill) => bill.online !== 0)
    .map<SheetCell>((bill) => ({
      amount: bill.online,
      ref: bill.ref,
      label: "Online",
      status: bill.status,
      pending: bill.pending,
    }));

  return {
    columns,
    owner: { cells: ownerCells, total: sum(ownerCells.map((cell) => cell.amount)) },
    rowCount: Math.max(1, ownerCells.length, ...columns.map((column) => column.cells.length)),
    grandTotal: sum(columns.map((column) => column.total)),
    cashSales: sum([...bills, ...pending].map((bill) => bill.cash)),
    onlineSales: sum([...bills, ...pending].map((bill) => bill.online)),
    // What the columns include of them: their lines, as the columns add them up.
    pending: { count: pending.length, total: sum(pending.flatMap((bill) => bill.lines.map((line) => line.amount))) },
  };
}

/**
 * Who gets a column: every active staff member, and anyone inactive who still
 * has work on this day. `staff` comes in the order they joined, and so do the
 * columns.
 */
export function columnsFor(staff: SheetStaff[], bills: DayBill[], pending: PendingBill[] = []): SheetStaff[] {
  const worked = new Set([...bills, ...pending].flatMap((bill) => bill.lines.map((line) => line.staffId)));
  return staff.filter((member) => member.active || worked.has(member.id));
}

/**
 * The outbox's bills of `businessDate` still waiting to be sent (P2.2e), as
 * the register draws them. `known` holds the ids of the bills the server has
 * already listed, so a bill that arrived but whose answer did not is drawn
 * once.
 *
 * A queued bill keeps its lines as the counter sent them and, beside them in
 * the same order, what each came to (`priceCart` prices line by line), so the
 * two are read together.
 */
export function pendingBillsOf(items: readonly OutboxItem[], businessDate: string, known: ReadonlySet<string>): PendingBill[] {
  return waitingBills(items, businessDate, known).map((entry) => ({
    slip: entry.bill.bookNo ?? "offline",
    lines: entry.bill.lines.map((line, index) => ({
      staffId: line.staffId,
      name: entry.preview.lines[index]?.name ?? "",
      amount: entry.preview.lines[index]?.amount ?? 0,
    })),
    cash: entry.bill.cash,
    online: entry.bill.online,
  }));
}
