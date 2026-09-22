/**
 * Creates the developer account — the role above the owner. Safe to run again:
 * if the account already exists it is left alone.
 *
 *   pnpm db:seed:developer
 *
 * The password comes from SEED_DEVELOPER_PASSWORD if set, otherwise a random
 * one is generated and printed ONCE. Write it down; it cannot be read back,
 * only reset.
 *
 * It is a separate script from `db:seed` on purpose. The owner and the manager
 * belong to the salon and are created when the salon is set up; this account
 * belongs to whoever maintains the system, and is created deliberately.
 *
 * The developer has a username and a password and nothing else — no PIN. The
 * PIN belongs to the owner, who confirms cash with it in person.
 */
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { user } from "../src/db/schema";
import { auth } from "../src/lib/auth/server";

const USERNAME = "developer";

async function main() {
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.username, USERNAME));
  if (existing.length > 0) {
    console.log(`skip   ${USERNAME} (already exists) — reset the password from the Passwords screen`);
    process.exit(0);
  }

  const password = process.env.SEED_DEVELOPER_PASSWORD ?? randomBytes(9).toString("base64url");
  const ctx = await auth.$context;
  const created = await ctx.internalAdapter.createUser(
    {
      name: "Developer",
      email: `${USERNAME}@art-man.local`,
      emailVerified: true,
      username: USERNAME,
      displayUsername: USERNAME,
      role: "developer",
    },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: await ctx.password.hash(password),
  });

  console.log(`create ${USERNAME}  password: ${password}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
