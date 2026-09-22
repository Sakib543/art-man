import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import * as schema from "../../db/schema";

/**
 * True while the account may sign in. Queried here rather than imported from
 * `db/user-account.ts`, which needs `auth` itself — the import would be a
 * cycle, and a cycle around the object every request depends on is not worth
 * saving four lines.
 */
async function isActive(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ active: schema.user.active })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  return row?.active ?? false;
}

/**
 * Server-side auth. Users sign in with a username and password.
 * Sign-up is disabled: the owner's and manager's accounts are created by
 * `pnpm db:seed` and the developer's by `pnpm db:seed:developer`, never
 * through the website.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: {
    additionalFields: {
      // "developer", "owner" or "manager". `input: false` stops a client from setting its own role.
      role: { type: "string", required: true, input: false, defaultValue: "manager" },
      // False once the account is closed on the Users screen (backlog P1.2).
      // Declared here so it rides along on the session and `getCurrentUser()`
      // can see it without a second query on every request.
      active: { type: "boolean", required: false, input: false, defaultValue: true },
    },
  },
  databaseHooks: {
    session: {
      create: {
        /**
         * Refuse to sign in a closed account. `validateUserInfo` does not run
         * for a username and password — Better Auth only re-validates
         * provider-returning sign-ins — so this is the documented place.
         *
         * It is belt and braces: `getCurrentUser()` already treats a closed
         * account as signed out, so even a session that slipped through would
         * reach no screen. Stopping it here is what lets the login form say
         * something, instead of bouncing the person back to it in silence.
         */
        before: async (session) => {
          if (await isActive(session.userId)) return;
          throw new APIError("FORBIDDEN", {
            // The code, not the status, is what tells the login screen this is
            // not a typing mistake: 403 on its own reads as a wrong password.
            code: "ACCOUNT_CLOSED",
            message: "This account has been closed.",
          });
        },
      },
    },
  },
  plugins: [username(), nextCookies()],
});
