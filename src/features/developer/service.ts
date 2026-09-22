import { eq } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { user as userTable } from "@/db/schema";
import { checkNewPassword } from "@/lib/auth/password-rules";
import { auth } from "@/lib/auth/server";
import type { SessionUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import { hashPin } from "@/lib/pin";

const actorOf = (user: SessionUser) => user.username || user.name;

async function loadTarget(userId: string) {
  const [row] = await db
    .select({ id: userTable.id, username: userTable.username, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (!row) throw new UserError("That account no longer exists.");
  return row;
}

/**
 * Set someone else's login password and sign them out everywhere.
 *
 * The developer cannot change their own password here — that would sign them
 * out mid-click. Settings has the normal "change your password" form, which
 * asks for the current one and keeps this session alive.
 */
export async function resetPassword(dev: SessionUser, userId: string, newPassword: string): Promise<void> {
  if (userId === dev.id) throw new UserError("Change your own password in Settings, not here.");

  const problem = checkNewPassword(newPassword);
  if (problem) throw new UserError(problem);

  const target = await loadTarget(userId);
  const ctx = await auth.$context;
  await ctx.internalAdapter.updatePassword(target.id, await ctx.password.hash(newPassword));
  for (const session of await ctx.internalAdapter.listSessions(target.id)) {
    await ctx.internalAdapter.deleteSession(session.token);
  }

  await writeAudit(db, {
    actor: actorOf(dev),
    action: "password.reset",
    target: target.username ?? target.id,
    after: { by: "developer" },
  });
}

/**
 * Set a new PIN for the Owner. Only the Owner has one (see `src/lib/pin.ts`),
 * so this refuses any other account rather than quietly storing a PIN nobody
 * will ever be asked for.
 *
 * A PIN cannot be read back, not even here: it is a scrypt hash. Resetting it
 * is the only way to recover a forgotten one, and it is audited.
 */
export async function resetPin(dev: SessionUser, userId: string, newPin: string): Promise<void> {
  const target = await loadTarget(userId);
  if (target.role !== "owner") throw new UserError("Only the Owner has a PIN.");

  await db.transaction(async (tx) => {
    await tx.update(userTable).set({ pinHash: await hashPin(newPin) }).where(eq(userTable.id, target.id));
    await writeAudit(tx, {
      actor: actorOf(dev),
      action: "owner.pin-reset",
      target: target.username ?? target.id,
      after: { by: "developer" },
    });
  });
}
