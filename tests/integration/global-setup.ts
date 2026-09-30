import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import type { TestProject } from "vitest/node";
import { describeDatabase, isLocalDatabase } from "../../src/lib/db-target";
import { DATABASE_PREFIX, TEMPLATE_DATABASE, withDatabase } from "./database-names";

declare module "vitest" {
  export interface ProvidedContext {
    /** The PostgreSQL server the suite runs on, connected to its `postgres` database. */
    serverUrl: string;
  }
}

/**
 * Runs once, before any test file: a fresh template database with every
 * migration in `drizzle/` applied, the way `pnpm db:migrate` applies them.
 * Each test file then gets a copy of it (`setup.ts`).
 *
 * `TEST_DATABASE_URL` names the server, and only a server on this computer is
 * accepted — the same rule as `pnpm db:migrate` without `--live` (P7.6). The
 * suite creates and drops databases, so it must never be pointed at live, and
 * `.env.local` is never read: nothing here can reach the salon's books.
 */
export async function setup(project: TestProject) {
  const serverUrl = process.env.TEST_DATABASE_URL;
  if (!serverUrl) {
    throw new Error(
      "Set TEST_DATABASE_URL to a PostgreSQL server on this computer, e.g. postgres://postgres@127.0.0.1:5544/postgres",
    );
  }
  if (!isLocalDatabase(serverUrl)) {
    throw new Error(`Refused: ${describeDatabase(serverUrl)} is not on this computer. The integration tests create and drop databases.`);
  }

  await dropTestDatabases(serverUrl);
  await onServer(serverUrl, (client) => client.query(`create database ${TEMPLATE_DATABASE}`));

  const template = new Client({ connectionString: withDatabase(serverUrl, TEMPLATE_DATABASE) });
  await template.connect();
  try {
    await migrate(drizzle(template), { migrationsFolder: "drizzle" });
  } finally {
    // A database is copied only while nobody is connected to it.
    await template.end();
  }

  project.provide("serverUrl", serverUrl);
  return () => dropTestDatabases(serverUrl);
}

/** The template and every file's copy — this run's, or a run that was stopped halfway. */
async function dropTestDatabases(serverUrl: string) {
  await onServer(serverUrl, async (client) => {
    const { rows } = await client.query<{ name: string }>("select datname as name from pg_database where datname like $1", [
      `${DATABASE_PREFIX}%`,
    ]);
    for (const { name } of rows) await client.query(`drop database if exists ${name} with (force)`);
  });
}

async function onServer<T>(serverUrl: string, work: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: serverUrl });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}
