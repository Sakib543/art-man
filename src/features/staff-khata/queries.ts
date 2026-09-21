import { asc } from "drizzle-orm";
import { db } from "@/db";
import { khataEntries, staff } from "@/db/schema";
import { withRunningBalance, type PayType, type Rupees } from "@/lib/accounting";

export interface KhataStaff {
  id: string;
  name: string;
  payType: PayType;
  salary: Rupees;
  commissionRate: number;
  active: boolean;
  balance: Rupees;
}

export interface LedgerRow {
  id: string;
  businessDate: string;
  label: string;
  /** Positive = owed to the staff member, negative = taken. */
  amount: Rupees;
  balance: Rupees;
}

export interface KhataData {
  staff: KhataStaff[];
  selected: KhataStaff;
  ledger: LedgerRow[];
}

/**
 * Within one day, money in comes before money out. Entries made in the same
 * transaction (Day Close) share one timestamp, so the time alone cannot order them.
 */
const KIND_ORDER: Record<string, number> = { earning: 0, bonus: 0, adjustment: 1, advance: 2, payment: 3 };

/** All staff with their balances, plus the ledger of one of them. Null when there is no staff yet. */
export async function getKhataData(requestedId?: string): Promise<KhataData | null> {
  const [staffRows, rawEntries] = await Promise.all([
    db.select().from(staff).orderBy(asc(staff.createdAt), asc(staff.name)),
    db.select().from(khataEntries),
  ]);
  if (staffRows.length === 0) return null;

  const allEntries = [...rawEntries].sort(
    (a, b) =>
      a.businessDate.localeCompare(b.businessDate) ||
      (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9) ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.id.localeCompare(b.id),
  );

  const balanceOf = new Map<string, Rupees>();
  for (const entry of allEntries) balanceOf.set(entry.staffId, (balanceOf.get(entry.staffId) ?? 0) + entry.amount);

  const list: KhataStaff[] = staffRows.map((row) => ({
    id: row.id,
    name: row.name,
    payType: row.payType as PayType,
    salary: row.salary,
    commissionRate: row.commissionRate,
    active: row.active,
    balance: balanceOf.get(row.id) ?? 0,
  }));

  const selected = list.find((member) => member.id === requestedId) ?? list[0];
  const ledger = withRunningBalance(
    allEntries
      .filter((entry) => entry.staffId === selected.id)
      .map(({ id, businessDate, label, amount }) => ({ id, businessDate, label, amount })),
  );

  return { staff: list, selected, ledger };
}
