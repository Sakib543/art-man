/**
 * Which migrations does a database actually have?
 *
 *   pnpm db:check                     # the database in .env.local (today: live, HANDOFF 9a)
 *   CHECK_DATABASE_URL="<live>" pnpm db:check
 *
 * `pnpm db:migrate` prints "migrations applied successfully" even when it had
 * nothing to do, and it never says which database it reached — so after
 * migrating live, that message is not evidence. This asks the database.
 *
 * Read-only: it selects, it never writes. Safe to point at live.
 */
// Must come first: it puts DATABASE_URL in the environment before src/db reads it.
import "./load-env";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const url = process.env.CHECK_DATABASE_URL ?? process.env.DATABASE_URL;

/** Never print the string itself (HANDOFF trap 8.6) — just enough to tell two apart. */
function describe(connectionString: string): string {
  try {
    const { host, pathname } = new URL(connectionString);
    return `${host}${pathname}`;
  } catch {
    return "unreadable connection string";
  }
}

/**
 * The migrations this checkout has, from drizzle-kit's own journal. Read at
 * run time rather than written into the message, which is how the message
 * came to say "16 means everything up to 0015" two migrations later.
 */
function migrationsInRepo(): { count: number; last: string } {
  const journal = JSON.parse(readFileSync(join(process.cwd(), "drizzle/meta/_journal.json"), "utf8")) as {
    entries: { tag: string }[];
  };
  return { count: journal.entries.length, last: journal.entries.at(-1)?.tag ?? "none" };
}

async function main() {
  if (!url) {
    console.error("No connection string. Set CHECK_DATABASE_URL, or run through .env.local.");
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  const { rows } = await client.query<{ n: number; latest: Date | null }>(
    "select count(*)::int as n, max(to_timestamp(created_at / 1000)) as latest from drizzle.__drizzle_migrations",
  );
  const column = await client.query(
    "select 1 from information_schema.columns where table_name = $1 and column_name = $2",
    ["user", "active"],
  );
  const users = await client.query<{ n: number }>("select count(*)::int as n from \"user\"");

  console.log(`database          ${describe(url)}`);
  const repo = migrationsInRepo();
  const behind = repo.count - rows[0].n;
  console.log(`migrations applied ${rows[0].n} of ${repo.count} in this checkout (last: ${repo.last})`);
  if (behind > 0) console.log(`                   ${behind} behind — run pnpm db:migrate against this database`);
  if (behind < 0) console.log(`                   ${-behind} more than this checkout has — git pull before migrating`);
  console.log(`last applied       ${rows[0].latest?.toISOString() ?? "never"}`);
  console.log(`user.active exists ${column.rowCount ? "yes" : "NO — P1.2 will fail on every page"}`);
  console.log(`login accounts     ${users.rows[0].n}`);

  await client.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
