/**
 * Creates the developer account — the one account a fresh database needs.
 * Safe to run again: if the account already exists it is left alone.
 *
 *   pnpm db:seed:developer
 *
 * The password comes from SEED_DEVELOPER_PASSWORD if set, otherwise a random
 * one is generated and printed ONCE. Write it down; it cannot be read back,
 * only reset.
 *
 * It is the only seed script, on purpose (backlog P1.9). Sign-up is disabled,
 * so something has to create the first account; everything after that is done
 * from the screens by the developer:
 *
 * - the Owner and the Manager on the Users screen,
 * - the Owner's 4-digit PIN on the Passwords screen,
 * - services, staff, partners and fixed expense lines on their own screens.
 *
 * The developer has a username and a password and nothing else — no PIN. The
 * PIN belongs to the owner, who confirms cash with it in person.
 */
// Must come first: it puts DATABASE_URL in the environment before src/db reads it.
import "./load-env";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { user } from "../src/db/schema";
import { auth } from "../src/lib/auth/server";

const USERNAME = "developer";

async function main() {
  // By role, not by name: the developer can rename their own account (P1.8),
  // and a renamed one must not let a second developer in beside it.
  const [existing] = await db.select({ username: user.username }).from(user).where(eq(user.role, "developer")).limit(1);
  if (existing) {
    console.log(`skip   a developer account already exists (${existing.username}) — reset its password from the Passwords screen`);
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
