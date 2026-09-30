/**
 * Apply the migrations in `drizzle/` to a database (backlog P7.6).
 *
 *   DATABASE_URL="<local copy>" pnpm db:migrate   # a database on this computer
 *   pnpm db:migrate --live                         # the database in .env.local — live today
 *
 * It replaces `drizzle-kit migrate`, which could not say where it was going
 * or be stopped: it took `DATABASE_URL_UNPOOLED || DATABASE_URL` after reading
 * `.env.local`, so naming a local copy with `DATABASE_URL` alone still migrated
 * live (QA-01). This picks the database with `directDatabaseUrl`, prints it,
 * refuses one that is not on this computer without `--live`, and then runs
 * drizzle-orm's own migrator — the one drizzle-kit calls — so the record of
 * what was applied (`drizzle.__drizzle_migrations`) is the same.
 */
import { outside } from "./load-env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { directDatabaseUrl } from "../src/lib/db-target";
import { writeTarget } from "./target";

async function main() {
  const url = writeTarget(directDatabaseUrl(outside, process.env), "migrate");

  // One connection, not a pool: a migration runs its statements one at a time.
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const before = await applied(client);
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    const after = await applied(client);
    console.log(after > before ? `applied   ${after - before} migration(s); ${after} in all` : `nothing to apply; ${after} in all`);
  } finally {
    await client.end();
  }
}

/** How many migrations the database records as applied; 0 on a fresh one. */
async function applied(client: Client): Promise<number> {
  // Two statements: a table named in a query must exist when it is parsed.
  const { rows } = await client.query<{ found: string | null }>("select to_regclass('drizzle.__drizzle_migrations')::text as found");
  if (!rows[0].found) return 0;
  const count = await client.query<{ n: number }>("select count(*)::int as n from drizzle.__drizzle_migrations");
  return count.rows[0].n;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
