import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { writeAudit } from "../../db/audit";
import * as schema from "../../db/schema";
import { loginAuditEntry } from "./login-audit";

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
 * Sign-up is disabled. The first account, the developer's, is created by
 * `pnpm db:seed:developer`; the developer then creates the owner and the
 * manager on the Users screen. Never through a public form.
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
  hooks: {
    /**
     * Every sign-in attempt, successful or not, goes in the audit log — spec
     * section 11 requires the failed ones (backlog P3.9).
     *
     * Why an `after` hook can see a failure at all: when an endpoint throws an
     * `APIError`, the dispatcher catches it, puts it in `ctx.context.returned`
     * and *then* runs the after hooks (read in
     * `better-auth/dist/api/dispatch.mjs`). A refused sign-in is therefore an
     * ordinary return value here, not an exception.
     */
    after: createAuthMiddleware(async (ctx) => {
      const returned = ctx.context.returned;
      const body = ctx.body as { username?: unknown; email?: unknown } | undefined;
      const entry = loginAuditEntry({
        path: ctx.path,
        username: body?.username ?? body?.email,
        failureCode: isAPIError(returned) ? (returned.body?.code ?? String(returned.status)) : null,
      });
      if (!entry) return;

      try {
        await writeAudit(db, entry);
      } catch (error) {
        // A log that cannot be written must not stop somebody signing in — the
        // counter still has to ring up bills.
        ctx.context.logger.error("Could not record the sign-in attempt", error);
      }
    }),
  },
  plugins: [username(), nextCookies()],
});
