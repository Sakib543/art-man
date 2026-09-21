/**
 * Adds the Owner-side starting data: two sample partners (50/50) and the usual
 * fixed monthly bills. Safe to run again: each part is skipped if it exists.
 *
 *   pnpm db:seed:accounts
 *
 * The partner names are placeholders; the Owner edits them on the Partners screen.
 */
import { count } from "drizzle-orm";
import { db } from "../src/db";
import { fixedExpenseLines, partners } from "../src/db/schema";

const PARTNERS = [
  { name: "Saud Sahab", sharePct: 50 },
  { name: "Partner", sharePct: 50 },
];

const FIXED_LINES = ["Rent", "Electricity", "Internet and bills", "Supplies"];

async function main() {
  const [{ value: partnerCount }] = await db.select({ value: count() }).from(partners);
  if (partnerCount === 0) {
    await db.insert(partners).values(PARTNERS);
    console.log(`added ${PARTNERS.length} partners`);
  } else {
    console.log("skip partners (already exist)");
  }

  const [{ value: lineCount }] = await db.select({ value: count() }).from(fixedExpenseLines);
  if (lineCount === 0) {
    await db.insert(fixedExpenseLines).values(FIXED_LINES.map((name) => ({ name })));
    console.log(`added ${FIXED_LINES.length} fixed expense lines`);
  } else {
    console.log("skip fixed lines (already exist)");
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
