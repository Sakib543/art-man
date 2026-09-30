import { getAllStaff } from "@/db/queries/day-copy";
import { getDayBills, type DayBill } from "@/db/queries/day-bills";
import type { SheetStaff } from "./grid";

/**
 * Any business day as a register — the Daily report's Register view (P6.4) —
 * as its two ingredients: the day's bills and every staff member. The screen
 * lays them out itself (`RegisterView`), because since P2.2e it adds the bills
 * still on this computer before it does.
 */
export async function getRegister(businessDate: string): Promise<{ bills: DayBill[]; staff: SheetStaff[] }> {
  const [bills, staff] = await Promise.all([getDayBills(businessDate), getAllStaff()]);
  // The columns need names, not pay (whose day's part `getAllStaff` reads for Day Close).
  return { bills, staff: staff.map(({ id, name, active }) => ({ id, name, active })) };
}
