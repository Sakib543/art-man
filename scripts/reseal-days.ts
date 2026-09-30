/**
 * Seal again, once, the closed days sealed before P7.8 (backlog P7.8, QA-27).
 *
 *   pnpm db:reseal                   # what it would do, on a database on this computer; writes nothing
 *   pnpm db:reseal --apply           # do it
 *   pnpm db:reseal --live --apply    # .env.local's database — live today
 *
 * Before P7.8 a day's code covered each bill's lines in whatever order the
 * database handed them back, so a day could stop matching its own records
 * with nothing changed. Codes now cover the lines in a fixed order, and a day
 * sealed the old way fails the check until it is sealed again.
 * `resealOldDays` does that only for a day whose records still give its code
 * the old way; a day whose records changed is left failing, and listed. Old
 * codes go to `day_snapshot_history`, and an audit row keeps both.
 *
 * A database made after P7.8 has nothing to seal again.
 */
import "./load-env";
import { db } from "../src/db";
import { resealOldDays } from "../src/db/day-code";
import { writeTarget } from "./target";

const ACTOR = "p7.8-reseal";

async function main() {
  writeTarget(process.env.DATABASE_URL, "seal days again on");
  const apply = process.argv.includes("--apply");

  let results: Awaited<ReturnType<typeof resealOldDays>> = [];
  try {
    await db.transaction(async (tx) => {
      results = await resealOldDays(tx, ACTOR);
      // A dry run works everything out in the transaction, then undoes it.
      if (!apply) throw new DryRun();
    });
  } catch (error) {
    if (!(error instanceof DryRun)) throw error;
  }

  if (results.length === 0) console.log("nothing   every closed day matches its records");
  for (const { businessDate, before, after } of results) {
    console.log(after ? `${apply ? "sealed" : "would seal"} ${businessDate}  ${before} -> ${after}` : `LEFT      ${businessDate}  ${before}: its records changed since it was sealed`);
  }
  if (!apply && results.some((result) => result.after)) console.log("dry run   nothing was written; add --apply to do it");
  process.exit(0);
}

class DryRun extends Error {}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
