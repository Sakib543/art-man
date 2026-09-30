/**
 * Reads `.env.local` for the command-line scripts and for `drizzle.config.ts`.
 * Import it first, before anything that touches `src/db` — that module builds
 * its pool the moment it is evaluated.
 *
 * It replaces `tsx --env-file=.env.local` in `package.json` (backlog P4.8).
 * The flag made the file compulsory, so seeding a different database meant
 * editing it. This does not: `loadEnvFile` leaves a variable alone when the
 * environment already has one, so
 *
 *   DATABASE_URL="<other database>" pnpm db:seed:developer
 *
 * reaches that database, and a missing file is not an error.
 */
import type { DatabaseEnv } from "../src/lib/db-target";

/**
 * The database strings the process environment set itself, before the file
 * filled in the rest (P7.6). `directDatabaseUrl` needs to know which is which:
 * a `DATABASE_URL` named on the command line must not be paired with the
 * file's `DATABASE_URL_UNPOOLED`, which is live's.
 */
export const outside: DatabaseEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
};

try {
  process.loadEnvFile(".env.local");
} catch {
  // Not present (e.g. CI, or a one-off run against another database).
}
