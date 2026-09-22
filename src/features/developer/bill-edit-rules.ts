/**
 * What makes a developer's bill edit acceptable. Pure, so the form and the
 * server apply exactly the same rules and the rules can be tested without a
 * database.
 *
 * The edit changes rows in place, which is why these checks matter more than
 * usual: nothing downstream will catch a bill whose lines no longer add up to
 * what was paid.
 */

export interface EditableLine {
  id: string;
  name: string;
  amount: number;
  staffId: string;
}

export interface BillEdit {
  lines: EditableLine[];
  cash: number;
  online: number;
}

export const sumLines = (lines: { amount: number }[]): number =>
  lines.reduce((total, line) => total + line.amount, 0);

/**
 * Returns what is wrong with the edit, or null when it is fine.
 *
 * `originalLineIds` are the bill's own line ids. The developer may change a
 * line but may not add or remove one: adding is a different bill, and removing
 * would delete a financial row, which this feature deliberately does not do.
 */
export function checkBillEdit(edit: BillEdit, originalLineIds: readonly string[]): string | null {
  if (edit.lines.length !== originalLineIds.length) return "The bill's lines cannot be added to or removed here.";

  const original = new Set(originalLineIds);
  for (const line of edit.lines) {
    if (!original.has(line.id)) return "The bill's lines cannot be added to or removed here.";
    if (!line.name.trim()) return "Every line needs a name.";
    if (!Number.isInteger(line.amount)) return "An amount must be a whole number of rupees.";
    if (line.amount < 0) return "An amount cannot be negative.";
    if (!line.staffId) return "Every line needs a staff member.";
  }
  if (new Set(edit.lines.map((line) => line.id)).size !== edit.lines.length) {
    return "The same line was sent twice.";
  }

  if (!Number.isInteger(edit.cash) || !Number.isInteger(edit.online)) {
    return "Cash and online must be whole numbers of rupees.";
  }
  if (edit.cash < 0 || edit.online < 0) return "Cash and online cannot be negative.";

  const total = sumLines(edit.lines);
  if (total <= 0) return "A bill must come to more than Rs 0.";
  if (edit.cash + edit.online !== total) {
    const gap = total - edit.cash - edit.online;
    return gap > 0
      ? `Cash and online are Rs ${gap} short of the bill's Rs ${total}.`
      : `Cash and online are Rs ${-gap} more than the bill's Rs ${total}.`;
  }

  return null;
}
