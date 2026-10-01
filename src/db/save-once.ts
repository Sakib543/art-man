import { eq } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { isUniqueViolation } from "@/lib/errors";

/**
 * Save something once per client id (P7.2), as a bill (P3.15) and a folder
 * entry (P2.2e) are: the screen sends the same id until it hears the save
 * worked, so a double press or a retry after a lost answer saves nothing
 * a second time.
 *
 * The id is looked up before `save` runs anything, so a repeat is answered even
 * when the first changed what `save` would now refuse — an installment that
 * paid off what was owed. Two sends at the same instant both get past the
 * look-up; the column's unique constraint lets one in and the other is let go
 * here. A null id — a screen loaded before P7.2 — saves as it always did.
 */
export async function saveOnce(
  table: PgTable,
  column: PgColumn,
  clientId: string | null,
  save: () => Promise<void>,
): Promise<void> {
  const savedEarlier = async () => {
    if (!clientId) return false;
    const rows = await db.select({ id: column }).from(table).where(eq(column, clientId)).limit(1);
    return rows.length > 0;
  };

  if (await savedEarlier()) return;
  try {
    await save();
  } catch (error) {
    if (isUniqueViolation(error) && (await savedEarlier())) return;
    throw error;
  }
}
