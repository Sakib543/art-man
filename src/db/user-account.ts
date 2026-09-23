import { auth } from "@/lib/auth/server";

/**
 * The two things every screen that manages someone else's login needs: set a
 * password, and end their sessions. Shared by the Users screen, the
 * developer's password screen and the Owner's section of Settings, so there is
 * one place that knows a password change must also sign the person out.
 *
 * Passwords are scrypt hashes and cannot be read back — resetting is the only
 * way to recover one. That is a fact about the hash, not a policy choice.
 */

/**
 * End every session this account has, so a password change or a closure takes
 * effect at once.
 *
 * `keepToken` spares one session — the one doing the changing, when someone is
 * setting their own password. Without it they would be signed out by their own
 * click and land on the login screen holding a password they had not written
 * down yet.
 */
export async function signOutEverywhere(userId: string, keepToken?: string): Promise<void> {
  const ctx = await auth.$context;
  for (const session of await ctx.internalAdapter.listSessions(userId)) {
    if (keepToken && session.token === keepToken) continue;
    await ctx.internalAdapter.deleteSession(session.token);
  }
}

/** Replace someone's password and sign them out everywhere. The caller checks who may do it. */
export async function setUserPassword(userId: string, newPassword: string, keepToken?: string): Promise<void> {
  const ctx = await auth.$context;
  await ctx.internalAdapter.updatePassword(userId, await ctx.password.hash(newPassword));
  await signOutEverywhere(userId, keepToken);
}
