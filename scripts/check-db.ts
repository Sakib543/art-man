/**
 * Which migrations does a database actually have?
 *
 *   pnpm db:check                     # the database in .env.local (dev)
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
  console.log(`migrations applied ${rows[0].n}   (16 means everything up to 0015)`);
  console.log(`last applied       ${rows[0].latest?.toISOString() ?? "never"}`);
  console.log(`user.active exists ${column.rowCount ? "yes" : "NO — P1.2 will fail on every page"}`);
  console.log(`login accounts     ${users.rows[0].n}`);

  await client.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
