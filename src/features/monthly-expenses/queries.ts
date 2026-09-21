import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { getMonthChoices, isMonthClosed } from "@/db/queries/months";
import { fixedExpenseLines, monthlyExpenses } from "@/db/schema";
import { monthlyExpenseTotals } from "@/lib/accounting";
import { formatMonth, monthStart } from "@/lib/business-date";
import type { ExpensesData, FixedLineRow, OtherRow } from "./types";

/** One month's fixed bills and other expenses. Null before the first business day. */
export async function getExpensesData(requestedMonth?: string): Promise<ExpensesData | null> {
  const months = await getMonthChoices();
  if (!months) return null;

  const month = months.choices.some((choice) => choice.month === requestedMonth) ? requestedMonth! : months.current;

  const [lines, entries, closed] = await Promise.all([
    db.select().from(fixedExpenseLines).orderBy(asc(fixedExpenseLines.createdAt)),
    db.select().from(monthlyExpenses).where(eq(monthlyExpenses.month, monthStart(month))).orderBy(desc(monthlyExpenses.createdAt)),
    isMonthClosed(month),
  ]);

  const fixedTotal = new Map<string, number>();
  for (const entry of entries) {
    if (entry.kind === "fixed") fixedTotal.set(entry.label, (fixedTotal.get(entry.label) ?? 0) + entry.amount);
  }

  // Every active line, plus an inactive line only if it has an amount this month.
  const fixed: FixedLineRow[] = lines
    .filter((line) => line.active || (fixedTotal.get(line.name) ?? 0) !== 0)
    .map((line) => ({
      id: line.id,
      name: line.name,
      paidByOwner: line.paidByOwner,
      active: line.active,
      amount: fixedTotal.get(line.name) ?? 0,
    }));

  const cancelled = new Set(entries.flatMap((entry) => (entry.voidsId ? [entry.voidsId] : [])));
  const others: OtherRow[] = entries
    .filter((entry) => entry.kind === "other")
    .map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt.toISOString(),
      reason: entry.reason ?? "",
      amount: entry.amount,
      paidFrom: entry.paidFrom,
      voided: cancelled.has(entry.id),
      isVoid: entry.voidsId !== null,
    }));

  const totals = monthlyExpenseTotals(entries.map((entry) => ({ kind: entry.kind, amount: entry.amount, paidFrom: entry.paidFrom })));

  return {
    month,
    monthLabel: formatMonth(month),
    closed,
    months: months.choices,
    fixed,
    others,
    totals: { fixed: totals.fixed, others: totals.others, total: totals.total },
  };
}
