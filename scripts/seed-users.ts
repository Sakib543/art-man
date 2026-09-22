/**
 * Creates the two login accounts (owner and manager). Safe to run again:
 * accounts that already exist are skipped.
 *
 *   pnpm db:seed
 *
 * Passwords come from SEED_OWNER_PASSWORD / SEED_MANAGER_PASSWORD if set,
 * otherwise a random one is generated and printed once. The owner PIN comes
 * from SEED_OWNER_PIN or is generated the same way. Change them after the
 * first login.
 */
// Must come first: it puts DATABASE_URL in the environment before src/db reads it.
import "./load-env";
import { randomBytes, randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { user } from "../src/db/schema";
import { auth } from "../src/lib/auth/server";
import type { Role } from "../src/lib/auth/roles";
import { hashPin } from "../src/lib/pin";

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

  // The owner also needs a 4-digit PIN to confirm cash taken from or added to the drawer.
  const [owner] = await db.select().from(user).where(eq(user.role, "owner")).limit(1);
  if (owner && !owner.pinHash) {
    const pin = process.env.SEED_OWNER_PIN ?? String(randomInt(0, 10000)).padStart(4, "0");
    await db.update(user).set({ pinHash: await hashPin(pin) }).where(eq(user.id, owner.id));
    console.log(`set    owner PIN: ${pin}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
