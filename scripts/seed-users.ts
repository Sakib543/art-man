/**
 * Creates the two login accounts (owner and manager). Safe to run again:
 * accounts that already exist are skipped.
 *
 *   pnpm db:seed
 *
 * Passwords come from SEED_OWNER_PASSWORD / SEED_MANAGER_PASSWORD if set,
 * otherwise a random one is generated and printed once. Change them after
 * the first login.
 */
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { user } from "../src/db/schema";
import { auth } from "../src/lib/auth/server";
import type { Role } from "../src/lib/auth/roles";

const accounts: { username: string; name: string; role: Role; passwordEnv: string }[] = [
  { username: "owner", name: "Saud Sahab", role: "owner", passwordEnv: "SEED_OWNER_PASSWORD" },
  { username: "manager", name: "Manager", role: "manager", passwordEnv: "SEED_MANAGER_PASSWORD" },
];

async function main() {
  const ctx = await auth.$context;

  for (const account of accounts) {
    const existing = await db.select({ id: user.id }).from(user).where(eq(user.username, account.username));
    if (existing.length > 0) {
      console.log(`skip   ${account.username} (already exists)`);
      continue;
    }

    const password = process.env[account.passwordEnv] ?? randomBytes(9).toString("base64url");
    const created = await ctx.internalAdapter.createUser(
      {
        name: account.name,
        email: `${account.username}@art-man.local`,
        emailVerified: true,
        username: account.username,
        displayUsername: account.username,
        role: account.role,
      },
      { method: "admin" },
    );
    await ctx.internalAdapter.linkAccount({
      userId: created.id,
      providerId: "credential",
      accountId: created.id,
      password: await ctx.password.hash(password),
    });

    console.log(`create ${account.username}  password: ${password}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
