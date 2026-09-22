import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { db } from "../../db";
import * as schema from "../../db/schema";

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
    },
  },
  plugins: [username(), nextCookies()],
});
