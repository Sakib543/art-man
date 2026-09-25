/**
 * Reads `.env.local` for the command-line scripts, the same way
 * `drizzle.config.ts` does. Import it first, before anything that touches
 * `src/db` — that module builds its pool the moment it is evaluated.
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
try {
  process.loadEnvFile(".env.local");
} catch {
  // Not present (e.g. CI, or a one-off run against another database).
}
