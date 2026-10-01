import { Client } from "pg";

/**
 * This file's database as its owner, the role migrations run as (P7.14). The
 * app connects as a login that owns nothing (`setup.ts`); a test about what
 * holds even for the owner — the triggers — or that changes a row behind the
 * app's back connects this way.
 */
export async function asOwner<T>(work: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.TEST_OWNER_DATABASE_URL });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}
