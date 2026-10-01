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

/**
 * The login the app connects as in the suite (P7.14): a member of
 * `art_man_app`, the role migration `0023` makes, which may read and write rows
 * and nothing more — as the app on the live site is meant to. Made by
 * `global-setup.ts`; roles belong to the whole server, so it is kept between
 * runs. The password only matters where the server asks for one (CI).
 */
export const APP_LOGIN = { user: "art_man_it_web", password: "integration-tests-only" };

/** The same database, connected to as the app's login instead of the owner. */
export function asAppLogin(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.username = APP_LOGIN.user;
  url.password = APP_LOGIN.password;
  return url.toString();
}
