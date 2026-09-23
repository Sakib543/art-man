import { and, count, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { auditLog, user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { checkNewPassword } from "@/lib/auth/password-rules";
import type { SessionUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import { hashPin } from "@/lib/pin";

const MAX_WRONG_TRIES = 5;
const LOCK_MINUTES = 15;
const actorOf = (user: SessionUser) => user.username || user.name;

/**
 * Check the signed-in person's own password. Wrong tries are audited and, like
 * PINs, count towards a short lock so the password cannot be guessed here.
 */
async function confirmOwnPassword(user: SessionUser, password: string): Promise<void> {
  const ctx = await auth.$context;
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000);
  const [{ wrong }] = await db
    .select({ wrong: count() })
    .from(auditLog)
    .where(and(eq(auditLog.action, "password.wrong"), eq(auditLog.target, user.id), gt(auditLog.createdAt, since)));
  if (wrong >= MAX_WRONG_TRIES) throw new UserError(`Too many wrong passwords. Try again in ${LOCK_MINUTES} minutes.`);

  const accounts = await ctx.internalAdapter.findAccounts(user.id);
  const credential = accounts.find((account) => account.providerId === "credential");
  if (!credential?.password || !(await ctx.password.verify({ hash: credential.password, password }))) {
    await writeAudit(db, { actor: actorOf(user), action: "password.wrong", target: user.id, success: false });
    throw new UserError("That password is not correct.");
  }
}

/** Change your own login password. Other devices are signed out; this one stays signed in. */
export async function changeOwnPassword(
  user: SessionUser,
  currentToken: string,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  const problem = checkNewPassword(input.newPassword, input.currentPassword);
  if (problem) throw new UserError(problem);
  await confirmOwnPassword(user, input.currentPassword);

  const ctx = await auth.$context;
  await ctx.internalAdapter.updatePassword(user.id, await ctx.password.hash(input.newPassword));

  const sessions = await ctx.internalAdapter.listSessions(user.id);
  for (const session of sessions) {
    if (session.token !== currentToken) await ctx.internalAdapter.deleteSession(session.token);
  }
  await writeAudit(db, { actor: actorOf(user), action: "password.change", target: user.id });
}

/** The Owner sets a new PIN. The Owner's account password confirms it, so a walk-up cannot change it. */
export async function changeOwnerPin(user: SessionUser, input: { password: string; newPin: string }): Promise<void> {
  if (user.role !== "owner") throw new UserError("Only the Owner has a PIN.");
  await confirmOwnPassword(user, input.password);

  await db.transaction(async (tx) => {
    await tx.update(userTable).set({ pinHash: await hashPin(input.newPin) }).where(eq(userTable.id, user.id));
    await writeAudit(tx, { actor: actorOf(user), action: "owner.pin-change", target: user.id });
  });
}

