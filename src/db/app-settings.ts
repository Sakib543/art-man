import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { appSettings } from "@/db/schema";

/** The one key in `app_settings` today. */
const MAINTENANCE = "maintenance";

export interface Maintenance {
  on: boolean;
  /** Null until someone has flipped the switch at least once. */
  changedAt: Date | null;
  changedBy: string | null;
}

/**
 * Read the maintenance switch. `cache` keeps it to one query per request even
 * though `requireUser` asks for it on every page and every Server Action.
 * No row means off, so a fresh database needs no seeding.
 */
export const readMaintenance = cache(async (): Promise<Maintenance> => {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, MAINTENANCE)).limit(1);
  return {
    on: row?.value === "on",
    changedAt: row?.updatedAt ?? null,
    changedBy: row?.updatedBy ?? null,
  };
});

/**
 * Turn the site off or back on. Only the developer reaches this — the check
 * lives in the Server Action, next to the session.
 */
export async function setMaintenance(actor: string, on: boolean): Promise<void> {
  const before = await readMaintenance();
  if (before.on === on) return;

  await db.transaction(async (tx) => {
    await tx
      .insert(appSettings)
      .values({ key: MAINTENANCE, value: on ? "on" : "off", updatedBy: actor })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: on ? "on" : "off", updatedBy: actor, updatedAt: new Date() },
      });
    await writeAudit(tx, {
      actor,
      action: on ? "maintenance.on" : "maintenance.off",
      target: MAINTENANCE,
      before: { on: before.on },
      after: { on },
    });
  });
}
