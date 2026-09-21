import type { DayBill } from "@/db/queries/day-bills";
import type { Rupees } from "@/lib/accounting";

/**
 * The daily worksheet: the day's bills laid out like the paper register, one
 * column per staff member plus an "Owner / Account" column for online money.
 * It is only a view of the bills, not a separate ledger.
 */

export interface SheetStaff {
  id: string;
  name: string;
  active: boolean;
}

export interface SheetCell {
  /** Negative on a reversal. */
  amount: Rupees;
  billNo: number;
  label: string;
  status: DayBill["status"];
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
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** Bills come newest first; the register reads oldest first. */
export function buildSheet(bills: DayBill[], staff: SheetStaff[]): Sheet {
  const ordered = [...bills].sort((a, b) => a.billNo - b.billNo);

  const columns = staff.map<SheetColumn>((member) => {
    const cells = ordered.flatMap((bill) =>
      bill.lines
        .filter((line) => line.staffId === member.id)
        .map<SheetCell>((line) => ({ amount: line.amount, billNo: bill.billNo, label: line.name, status: bill.status })),
    );
    return { staff: member, cells, total: sum(cells.map((cell) => cell.amount)) };
  });

  const ownerCells = ordered
    .filter((bill) => bill.online !== 0)
    .map<SheetCell>((bill) => ({ amount: bill.online, billNo: bill.billNo, label: "Online", status: bill.status }));

  return {
    columns,
    owner: { cells: ownerCells, total: sum(ownerCells.map((cell) => cell.amount)) },
    rowCount: Math.max(1, ownerCells.length, ...columns.map((column) => column.cells.length)),
    grandTotal: sum(columns.map((column) => column.total)),
    cashSales: sum(bills.map((bill) => bill.cash)),
    onlineSales: sum(bills.map((bill) => bill.online)),
  };
}
