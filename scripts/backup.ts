/**
 * A backup of the whole database, as one file (backlog P3.7).
 *
 *   pnpm db:backup                                  # the database in .env.local
 *   DATABASE_URL="<other>" pnpm db:backup           # any other database
 *   PG_DUMP="C:\\path\\to\\pg_dump.exe" pnpm db:backup
 *
 * It shells out to `pg_dump` in its custom format (`-Fc`), which is what
 * `pg_restore` reads. Writing our own exporter was considered and rejected:
 * a restore has to reproduce types, defaults, indexes, the enums and the 14
 * append-only triggers, and a hand-rolled JSON dump quietly loses those.
 *
 * The file is the salon's whole book of accounts in plain form. It goes to
 * `backups/`, which is git-ignored, and it must not be committed or emailed.
 */
import "./load-env";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "backups";

/**
 * Neon's pooled connection goes through PgBouncer, which `pg_dump` cannot use
 * for everything it needs. The direct (unpooled) string is the right one, and
 * it is the same variable migrations already use.
 */
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

/** pg_dump is not on PATH on a standard Windows install, so look there too. */
function findPgDump(): string {
  if (process.env.PG_DUMP) return process.env.PG_DUMP;
  for (const version of [18, 17, 16]) {
    const candidate = `C:\\Program Files\\PostgreSQL\\${version}\\bin\\pg_dump.exe`;
    if (existsSync(candidate)) return candidate;
  }
  // Linux, macOS, or Windows with the bin folder on PATH.
  return "pg_dump";
}

/** "2026-09-23T19-40-06" — sorts by name, and is legal in a Windows filename. */
const stamp = () => new Date().toISOString().replace(/:/g, "-").replace(/\..+$/, "");

/** Never print the connection string itself (HANDOFF trap 8.6). */
function describe(connectionString: string): string {
  try {
    const { host, pathname } = new URL(connectionString);
    return `${host}${pathname}`;
  } catch {
    return "unreadable connection string";
  }
}

function main() {
  if (!url) {
    console.error("No connection string. Set DATABASE_URL, or run through .env.local.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL_UNPOOLED) {
    console.warn("Note: DATABASE_URL_UNPOOLED is not set, so the pooled connection is being used.");
    console.warn("      If pg_dump fails, put the direct (unpooled) string in .env.local and run it again.");
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const file = join(OUT_DIR, `art-man-${stamp()}.dump`);

  console.log(`database  ${describe(url)}`);
  console.log(`writing   ${file}`);

  const child = spawn(
    findPgDump(),
    [
      "--format=custom",
      // The restore target owns what it restores; on Neon and on a VPS the role
      // is not the same one, and without these two the restore stops on every
      // OWNER TO and GRANT line.
      "--no-owner",
      "--no-privileges",
      "--file",
      file,
      url,
    ],
    { stdio: ["ignore", "inherit", "inherit"] },
  );

  child.on("error", (error) => {
    console.error(`Could not run pg_dump: ${error.message}`);
    console.error("Install the PostgreSQL client tools, or point PG_DUMP at pg_dump.");
    process.exit(1);
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(`pg_dump failed (exit ${code}). Nothing to trust in ${file}; delete it.`);
      process.exit(code ?? 1);
    }
    const kb = Math.round(statSync(file).size / 1024);
    console.log(`done      ${kb} KB`);
    console.log("Restore instructions: docs/BACKUP.md. A backup nobody has ever restored is not a backup.");
  });
}

main();
