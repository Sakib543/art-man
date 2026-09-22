import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { user as userTable } from "@/db/schema";
import { setUserPassword, signOutEverywhere } from "@/db/user-account";
import { checkNewPassword } from "@/lib/auth/password-rules";
import { auth } from "@/lib/auth/server";
import type { SessionUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import { countActiveOwners, findUser } from "./queries";
import { checkCreate, checkResetPassword, checkSetActive } from "./rules";
import type { CreateUserInput } from "./schemas";

const actorOf = (user: SessionUser) => user.username || user.name;

/** Better Auth needs an email. Nobody reads it; it exists so the row is valid. */
const emailFor = (username: string) => `${username}@art-man.local`;

async function load(userId: string) {
  const target = await findUser(userId);
  if (!target) throw new UserError("That account no longer exists.");
  return target;
}

/**
 * Create a login (backlog P1.2). Public sign-up stays off — `disableSignUp` is
 * set on Better Auth, so this goes through the same internal adapter the seed
 * scripts use, and the only way to get an account is for someone who already
 * has one to make it.
 *
 * The password is chosen here and shown to the creator once, exactly as
 * `pnpm db:seed` prints it once. It cannot be read back afterwards.
 */
export async function createUser(actor: SessionUser, input: CreateUserInput): Promise<{ username: string }> {
  const refusal = checkCreate(actor, input.role);
  if (refusal) throw new UserError(refusal);

  const problem = checkNewPassword(input.password);
  if (problem) throw new UserError(problem);

  const email = emailFor(input.username);
  const [clash] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(or(eq(userTable.username, input.username), eq(userTable.email, email)))
    .limit(1);
  if (clash) throw new UserError(`The username "${input.username}" is already taken.`);

  const ctx = await auth.$context;
  const created = await ctx.internalAdapter.createUser(
    {
      name: input.name,
      email,
      emailVerified: true,
      username: input.username,
      displayUsername: input.username,
      role: input.role,
    },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: await ctx.password.hash(input.password),
  });

  // Never the password, not even hashed: the audit log is read by people.
  await writeAudit(db, {
    actor: actorOf(actor),
    action: "user.create",
    target: input.username,
    after: { name: input.name, role: input.role },
  });

  return { username: input.username };
}

/** Set someone else's password and sign them out everywhere. */
export async function resetUserPassword(actor: SessionUser, userId: string, newPassword: string): Promise<void> {
  const target = await load(userId);

  const refusal = checkResetPassword(actor, target);
  if (refusal) throw new UserError(refusal);

  const problem = checkNewPassword(newPassword);
  if (problem) throw new UserError(problem);

  await setUserPassword(target.id, newPassword);
  await writeAudit(db, {
    actor: actorOf(actor),
    action: "password.reset",
    target: target.username ?? target.id,
    after: { from: "users screen" },
  });
}

/**
 * Close an account, or open it again. Closing is never a delete: `audit_log`
 * ties every action to the actor's username, and a record whose actor has
 * vanished stops making sense.
 *
 * A closed account is signed out at once, and `getCurrentUser()` then treats
 * any cookie it still holds as signed out.
 */
export async function setUserActive(actor: SessionUser, userId: string, next: boolean): Promise<void> {
  const target = await load(userId);

  const refusal = checkSetActive(actor, target, next, await countActiveOwners());
  if (refusal) throw new UserError(refusal);

  await db.transaction(async (tx) => {
    await tx.update(userTable).set({ active: next }).where(eq(userTable.id, target.id));
    await writeAudit(tx, {
      actor: actorOf(actor),
      action: next ? "user.reopen" : "user.close",
      target: target.username ?? target.id,
      before: { active: target.active },
      after: { active: next },
    });
  });

  // Outside the transaction: ending sessions is Better Auth's own work, and a
  // closed account must not keep a live one even if this part were to fail
  // loudly. Re-opening needs no sign-out.
  if (!next) await signOutEverywhere(target.id);
}
