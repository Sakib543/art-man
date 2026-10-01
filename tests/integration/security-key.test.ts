import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { cancelBill } from "@/db/bill-cancel";
import { checkDayCodes, computeDayCode, type DayFigures } from "@/db/day-code";
import { allowFinancialEdit } from "@/db/financial-edit";
import { bills, businessDays, daySnapshots } from "@/db/schema";
import { getSecurityCodes } from "@/features/security-codes/queries";
import { asOwner } from "./owner";
import { closeAndStartNext, closeToday, openDay, ringUp, seedSalon, type Salon } from "./salon";

/**
 * P7.8b (QA-26): the server's key, which the database does not hold. The
 * audit's attack — change a closed day in the database, work its code out
 * again and write it back, and every day after it — left every day checking
 * out. With the key the codes it works out are plain hashes, and none of those
 * days matches; without the key they all still do, which is what the key and
 * the close slip are for.
 */
let salon: Salon;

const secret = Buffer.alloc(32, 7).toString("base64url");
/** The key the salon's server holds, sealing from the first day on. */
const KEY = `2026-09-01.${secret}`;
const setServerKey = (value: string) => vi.stubEnv("SECURITY_CODE_KEY", value);

const checks = async (from: string, to: string) =>
  (await checkDayCodes(from, to)).map((day) => [day.businessDate, day.ok, day.keyed]);

const FIGURES = [
  "sale",
  "cash",
  "online",
  "expenses",
  "staffEarned",
  "staffPaid",
  "dayProfit",
  "openingCash",
  "expectedCash",
  "countedCash",
  "difference",
] as const;

/**
 * What someone with the database and the code, but not the key, can do: work
 * a day's code out again from its records as they are now, chained on the day
 * before as it now stands, and write it over the one the day was sealed with.
 */
async function sealAgainWithoutTheKey(dates: string[]) {
  setServerKey("");
  for (const date of dates) {
    const [row] = await db.select().from(daySnapshots).where(eq(daySnapshots.businessDate, date));
    const figures = Object.fromEntries(FIGURES.map((name) => [name, row[name]])) as DayFigures;
    const code = await computeDayCode(db, date, figures, row.diffReason);
    await asOwner(async (client) => {
      await client.query("begin");
      await client.query("alter table day_snapshots disable trigger day_snapshots_no_update");
      await client.query("update day_snapshots set security_code = $1 where business_date = $2", [code, date]);
      await client.query("alter table day_snapshots enable trigger day_snapshots_no_update");
      await client.query("commit");
    });
  }
}

beforeAll(async () => {
  salon = await seedSalon({ firstDay: { date: "2026-09-01", openingCash: 5_000 } });
  const { manager, services, staff } = salon;
  setServerKey(KEY);
  await ringUp(
    manager,
    [
      { serviceId: services.Shave, staffId: staff.Bilal },
      { serviceId: services.Haircut, staffId: staff.Karim },
    ],
    { cash: 750 },
  );
  await closeAndStartNext(manager);
  await ringUp(manager, [{ serviceId: services.Haircut, staffId: staff.Arshad }], { cash: 500 });
  await closeAndStartNext(manager);
  await ringUp(manager, [{ serviceId: services.Shave, staffId: staff.Bilal }], { cash: 250 });
  await closeAndStartNext(manager);
});

describe("the server's key (P7.8b)", () => {
  it("seals every day it closes, and each matches", async () => {
    setServerKey(KEY);
    expect(await checks("2026-09-01", "2026-09-03")).toEqual([
      ["2026-09-01", true, true],
      ["2026-09-02", true, true],
      ["2026-09-03", true, true],
    ]);
  });

  it("is on the Owner's Security codes screen, with its first day", async () => {
    setServerKey(KEY);
    expect((await getSecurityCodes("2026-09"))?.key).toEqual({ state: "set", since: "2026-09-01" });
    setServerKey("");
    expect((await getSecurityCodes("2026-09"))?.key).toEqual({ state: "not-set" });
  });

  it("catches a day changed in the database whose code, and every later one, was worked out again without it (QA-26)", async () => {
    const [bill] = await db.select().from(bills).where(eq(bills.businessDate, "2026-09-01"));
    await db.transaction(async (tx) => {
      await allowFinancialEdit(tx);
      await tx.execute(sql`update bill_lines set amount = 50 where bill_id = ${bill.id} and name = 'Shave'`);
    });
    await sealAgainWithoutTheKey(["2026-09-01", "2026-09-02", "2026-09-03"]);

    // Without the key — as before P7.8b — the rewritten chain checks out from end to end.
    setServerKey("");
    expect(await checks("2026-09-01", "2026-09-03")).toEqual([
      ["2026-09-01", true, false],
      ["2026-09-02", true, false],
      ["2026-09-03", true, false],
    ]);
    // With it, not one of the three days does.
    setServerKey(KEY);
    expect(await checks("2026-09-01", "2026-09-03")).toEqual([
      ["2026-09-01", false, false],
      ["2026-09-02", false, false],
      ["2026-09-03", false, false],
    ]);
  });
});

describe("a key set on a salon that already has days (P7.8b)", () => {
  /** The same secret, sealing from 6 Sep: what a server that got its key late holds. */
  const LATE_KEY = `2026-09-06.${secret}`;

  beforeAll(async () => {
    const { manager, services, staff } = salon;
    setServerKey("");
    await ringUp(manager, [{ serviceId: services.Haircut, staffId: staff.Karim }], { cash: 500 }); // 4 Sep
    await closeAndStartNext(manager);
    await ringUp(manager, [{ serviceId: services.Shave, staffId: staff.Arshad }], { cash: 250 }); // 5 Sep
    await closeAndStartNext(manager);
    setServerKey(LATE_KEY);
    await ringUp(manager, [{ serviceId: services.Haircut, staffId: staff.Bilal }], { cash: 500 }); // 6 Sep
    await closeAndStartNext(manager);
  });

  it("still matches the days sealed before its first day without it, and seals from then on with it", async () => {
    setServerKey(LATE_KEY);
    expect(await checks("2026-09-04", "2026-09-06")).toEqual([
      ["2026-09-04", true, false],
      ["2026-09-05", true, false],
      ["2026-09-06", true, true],
    ]);
  });

  it("does not match a day from its first day on that was sealed without it, though nothing in the day changed", async () => {
    setServerKey(""); // a server without the key, or someone sealing the day again by hand
    await ringUp(salon.manager, [{ serviceId: salon.services.Shave, staffId: salon.staff.Karim }], { cash: 250 }); // 7 Sep
    await closeAndStartNext(salon.manager);

    expect(await checks("2026-09-07", "2026-09-07")).toEqual([["2026-09-07", true, false]]);
    setServerKey(LATE_KEY);
    expect(await checks("2026-09-07", "2026-09-07")).toEqual([["2026-09-07", false, false]]);
  });

  it("seals with it a day before its first day that is corrected once it is set — the day after still matches", async () => {
    setServerKey(LATE_KEY);
    const [bill] = await db.select().from(bills).where(eq(bills.businessDate, "2026-09-04"));
    await cancelBill(salon.owner, bill.id, "Customer disputed it");

    expect(await checks("2026-09-04", "2026-09-05")).toEqual([
      ["2026-09-04", true, true],
      ["2026-09-05", true, false],
    ]);
  });
});

describe("a key set wrongly (P7.8b)", () => {
  it("stops Day close rather than sealing the day without a key, and the Security codes screen checks nothing", async () => {
    setServerKey("2026-09-01.too-short");
    await ringUp(salon.manager, [{ serviceId: salon.services.Haircut, staffId: salon.staff.Arshad }], { cash: 500 });
    const today = await openDay();

    await expect(closeToday(salon.manager)).rejects.toThrow("SECURITY_CODE_KEY is not in the form");
    const [day] = await db.select().from(businessDays).where(eq(businessDays.businessDate, today));
    expect(day.closedAt).toBeNull();

    const screen = await getSecurityCodes("2026-09");
    expect(screen?.key).toEqual({ state: "invalid" });
    expect(screen?.days).toEqual([]);

    setServerKey(KEY);
    await closeToday(salon.manager);
    expect(await checks(today, today)).toEqual([[today, true, true]]);
  });
});
