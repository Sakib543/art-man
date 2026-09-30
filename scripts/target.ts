import { describeDatabase, isLocalDatabase } from "../src/lib/db-target";

/**
 * Say which database a script is about to write to, and refuse one that is
 * not on this computer unless the command carries `--live` (backlog P7.6,
 * QA-01). `.env.local` is the live database today (HANDOFF 9a), so a plain
 * `pnpm db:migrate` is refused and `pnpm db:migrate --live` is how live is
 * migrated on purpose. A database on this computer — a restored copy, a test
 * cluster — needs no flag.
 *
 * `doing` finishes "To … it, run the same command with --live."
 */
export function writeTarget(url: string | undefined, doing: string): string {
  if (!url) {
    console.error("No connection string. Set DATABASE_URL, or run through .env.local.");
    process.exit(1);
  }
  const where = describeDatabase(url);
  const local = isLocalDatabase(url);
  console.log(`database  ${where}${local ? "  (on this computer)" : ""}`);
  if (!local && !process.argv.includes("--live")) {
    console.error(`refused   ${where} is not on this computer, so it may be the salon's live database.`);
    console.error(`          To ${doing} it, run the same command with --live.`);
    process.exit(1);
  }
  return url;
}
