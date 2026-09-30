import { defineConfig } from "drizzle-kit";
// drizzle-kit does not read .env.local on its own; this does, and notes what the environment set first.
import { outside } from "./scripts/load-env";
import { directDatabaseUrl } from "./src/lib/db-target";

/**
 * For `pnpm db:generate`, which reads the schema and needs no database, and
 * `pnpm db:studio`. Migrations do not come through here any more: `pnpm
 * db:migrate` is `scripts/migrate.ts`, which says where it is going and asks
 * for `--live` (P7.6). The database is chosen the same way, so a `DATABASE_URL`
 * named on the command line is never paired with the file's live direct string.
 */
export default defineConfig({
  schema: "./src/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: directDatabaseUrl(outside, process.env) ?? "" },
});
