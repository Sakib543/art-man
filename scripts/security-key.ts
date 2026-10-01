/**
 * Make the server's key for security codes (backlog P7.8b, QA-26).
 *
 *   pnpm security-key                       # sealed with it from tomorrow, Karachi time
 *   pnpm security-key --since 2026-10-05    # from that business day
 *
 * Prints one `SECURITY_CODE_KEY` value: the first business day whose close
 * must be sealed with the key, a dot, and 32 random bytes. It goes into the
 * server's environment and nowhere the database can reach — Vercel, Settings,
 * Environment Variables, Production, then a redeploy (docs/DEPLOY_VERCEL.md
 * 0.4). Not into the database, not into a backup, not into a developer's
 * .env.local, which runs against live. A copy goes to the Owner, on paper or
 * in a password manager: a server moved or rebuilt needs the same key, or
 * every day sealed with it stops matching.
 *
 * Pick a day no close has happened on yet, after the redeploy that carries the
 * key: a day from it on that was closed without the key does not match.
 *
 * Reads nothing and writes nothing — no database, no file.
 */
import { nextDate, todayInKarachi } from "../src/lib/business-date";
import { newSecurityKey } from "../src/lib/security-key";

const at = process.argv.indexOf("--since");
const since = at === -1 ? nextDate(todayInKarachi()) : process.argv[at + 1];

try {
  console.log(newSecurityKey(since ?? ""));
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
