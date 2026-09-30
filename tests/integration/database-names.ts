/** Every database the integration suite makes starts with this, so it can find and drop its own and nothing else. */
export const DATABASE_PREFIX = "art_man_it_";

/** Migrated once per run by `global-setup.ts`; each test file gets a copy. */
export const TEMPLATE_DATABASE = `${DATABASE_PREFIX}template`;

/** The same server, another database. */
export function withDatabase(serverUrl: string, database: string): string {
  const url = new URL(serverUrl);
  url.pathname = `/${database}`;
  return url.toString();
}
