import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { writeAudit } from "../../db/audit";
import { signInLockFor } from "../../db/sign-in-guard";
import * as schema from "../../db/schema";
import { loginAuditEntry, throttledAuditEntry } from "./login-audit";
import { clientIpOf, SIGN_IN_LOCKED, signInLockedMessage } from "./sign-in-lock";
import { MAX_USERNAME_LENGTH, MIN_USERNAME_LENGTH, usernameCharactersOk } from "./username-rules";

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
 * The one header this platform sets itself with the client's address (P7.12,
 * QA-34). Vercel overwrites `X-Forwarded-For`, so a client cannot choose its
 * value there; behind another proxy — the VPS of backlog P5.3 — set
 * `CLIENT_IP_HEADER` to the header that proxy writes (nginx: `X-Real-IP`).
 * Better Auth keys its limiter on it, and the audit log records it.
 */
const CLIENT_IP_HEADER = process.env.CLIENT_IP_HEADER?.trim().toLowerCase() || "x-forwarded-for";

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
  /**
   * Better Auth's own limiter (P7.12): per client address, in each server's
   * memory — a flood guard, refusing a request before it reaches the app and
   * without writing it down. Ten sign-ins a minute from one address, looser
   * than the account lock below (5 wrong in 15 minutes), so that lock, which
   * is shared and written down, is what a person guessing at a password meets
   * first. On in production only, as Better Auth has it.
   */
  rateLimit: {
    customRules: { "/sign-in/*": { window: 60, max: 10 } },
  },
  advanced: {
    ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
  },
  hooks: {
    /**
     * A username locked after too many wrong passwords is refused before its
     * password is checked (P7.12, QA-34; `db/sign-in-guard.ts`), and the
     * refusal goes in the audit log as `login.throttled`. It is written here:
     * an error thrown by a `before` hook skips the `after` hooks.
     */
    before: createAuthMiddleware(async (ctx) => {
      if (!ctx.path.startsWith("/sign-in/")) return;
      const body = ctx.body as { username?: unknown; email?: unknown } | undefined;
      const typed = body?.username ?? body?.email;

      const lock = await signInLockFor(typed);
      if (!lock.locked) return;

      try {
        await writeAudit(db, throttledAuditEntry(typed, SIGN_IN_LOCKED, lock.minutesLeft, clientIpOf(ctx.headers, CLIENT_IP_HEADER)));
      } catch (error) {
        ctx.context.logger.error("Could not record the refused sign-in", error);
      }
      throw new APIError("TOO_MANY_REQUESTS", { code: SIGN_IN_LOCKED, message: signInLockedMessage(lock.minutesLeft) });
    }),
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
        ip: clientIpOf(ctx.headers, CLIENT_IP_HEADER),
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
  // The username rules are ours and Better Auth's alike (P7.17, QA-21): it
  // checks them at sign-in too, so a wider rule of ours would lock someone out.
  plugins: [
    username({
      minUsernameLength: MIN_USERNAME_LENGTH,
      maxUsernameLength: MAX_USERNAME_LENGTH,
      usernameValidator: usernameCharactersOk,
    }),
    nextCookies(),
  ],
});
