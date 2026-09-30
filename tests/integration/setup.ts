import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, inject, vi } from "vitest";
import { DATABASE_PREFIX, TEMPLATE_DATABASE, withDatabase } from "./database-names";

/**
 * Runs before each test file, in its own worker, before the file's imports:
 * the file gets a database of its own, copied from the migrated template, and
 * `src/db` — which builds its pool from `DATABASE_URL` the moment it is first
 * imported — connects to that copy and nothing else.
 */
const serverUrl = inject("serverUrl");
const database = `${DATABASE_PREFIX}${randomUUID().replaceAll("-", "").slice(0, 16)}`;

const admin = new Client({ connectionString: serverUrl });
await admin.connect();
try {
  await copyTemplate(admin);
} finally {
  await admin.end();
}

const url = withDatabase(serverUrl, database);
process.env.DATABASE_URL = url;
process.env.DATABASE_URL_UNPOOLED = url;
// Better Auth signs its cookies with this; a fixed value that is only ever used here.
process.env.BETTER_AUTH_SECRET = "integration-tests-only-not-a-real-secret-0123456789";
process.env.BETTER_AUTH_URL = "http://localhost:3000";

/**
 * Next's request APIs, outside Next. `headers()` answers what the test last
 * set with `asRequest` (`request.ts`), so a Server Action or a Route Handler
 * finds the session of whoever the test signed in; `cookies()` takes what
 * Better Auth's `nextCookies` plugin sets and drops it. `revalidatePath`
 * needs Next's render cache, which is not here, and does nothing a test reads.
 */
vi.mock("next/headers", async () => {
  const { requestHeaders } = await import("./request");
  return {
    headers: async () => requestHeaders(),
    cookies: async () => ({
      get: () => undefined,
      getAll: () => [],
      has: () => false,
      set: () => undefined,
      delete: () => undefined,
    }),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: () => undefined, revalidateTag: () => undefined }));

afterAll(async () => {
  // Imported here, not at the top: `src/db` must not build its pool before DATABASE_URL is set.
  const { db } = await import("@/db");
  await db.$client.end();
});

/** A few copies may be made at once, one per worker; PostgreSQL can refuse one while another is starting. */
async function copyTemplate(client: Client) {
  for (let attempt = 1; ; attempt++) {
    try {
      await client.query(`create database ${database} template ${TEMPLATE_DATABASE}`);
      return;
    } catch (error) {
      if (attempt >= 10 || !/being accessed by other users/.test(String(error))) throw error;
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }
}
