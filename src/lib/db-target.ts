/**
 * Which database a command-line script reaches (backlog P7.6, QA-01). Pure:
 * `scripts/` and `drizzle.config.ts` read the environment and ask this.
 *
 * `.env.local` holds two strings for one database: `DATABASE_URL` (the app's,
 * pooled) and `DATABASE_URL_UNPOOLED` (the direct one, which migrations and
 * backups prefer). Today that database is live (HANDOFF 9a). Naming another
 * database on the command line with `DATABASE_URL` alone used to leave the
 * file's direct string in charge — so `DATABASE_URL=<local> pnpm db:migrate`
 * migrated live.
 */

/** The two strings, from an environment — `process.env` itself will do. */
export interface DatabaseEnv {
  DATABASE_URL?: string;
  DATABASE_URL_UNPOOLED?: string;
  [name: string]: string | undefined;
}

/**
 * The direct connection string for a migration or a backup. A database named
 * in the process environment is the one meant, whole: if the environment set
 * `DATABASE_URL` and no `DATABASE_URL_UNPOOLED` of its own, the file's direct
 * string belongs to a different database and is not used. Otherwise the
 * direct string when there is one, else the ordinary one.
 *
 * `outside` is what the process environment set before `.env.local` was
 * read; `merged` is the environment after.
 */
export function directDatabaseUrl(outside: DatabaseEnv, merged: DatabaseEnv): string | undefined {
  if (outside.DATABASE_URL && !outside.DATABASE_URL_UNPOOLED) return outside.DATABASE_URL;
  return merged.DATABASE_URL_UNPOOLED || merged.DATABASE_URL || undefined;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** On this computer. Anything else — Neon, a VPS, a string that does not parse — may be the salon's live database. */
export function isLocalDatabase(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return LOCAL_HOSTS.has(hostname) || /^127\.\d+\.\d+\.\d+$/.test(hostname);
  } catch {
    return false;
  }
}

/** Host and database name, enough to tell two apart — never the string itself, which holds the password (HANDOFF 8.6). */
export function describeDatabase(url: string): string {
  try {
    const { host, pathname } = new URL(url);
    return `${host}${pathname}`;
  } catch {
    return "an unreadable connection string";
  }
}
