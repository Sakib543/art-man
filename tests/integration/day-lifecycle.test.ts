import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { cancelBill } from "@/db/bill-cancel";
import { checkDayCodes } from "@/db/day-code";
import { attendance, bills, daySnapshotHistory, daySnapshots, khataEntries } from "@/db/schema";
import { reopenDay, startNextDay } from "@/features/day-close/service";
import { saveStaff } from "@/features/staff-rates/service";
import { addStaff, closeToday, openDay, ringUp, seedSalon, type Salon } from "./salon";

/**
 * P7.3 (QA-04 Critical): the day lifecycle — close → rate change → a
 * correction to the closed day → reopen → close again. A closed day is always
 * settled on its own staff list and pay, saved at close; a rate change applies
 * forward only (spec §6.5). The scenario is the audit's: on 4 Sep Arshad
 * earns 10% commission, Bilal and Karim a daily wage of 700 and 500. After it
 * closes, Bilal goes to 900, Arshad to 20%, Karim leaves and Newbie joins on
 * Rs 1,000 a day — then the Owner cancels one of Arshad's Rs 1,250 bills of
 * 4 Sep. Before P7.3 that re-posted 4 Sep as Arshad 1,000 · Bilal 900 · Karim 0
 * · Newbie 1,000.
 */
let salon: Salon;
let newbie: string;

const FOURTH = "2026-09-04";
const FIFTH = "2026-09-05";

/** What each person's khata holds for one day, reversals and re-postings netted. */
async function earnedOn(businessDate: string): Promise<Record<string, number>> {
  const lines = await db.select().from(khataEntries).where(eq(khataEntries.businessDate, businessDate));
  const byName = Object.fromEntries(Object.entries({ ...salon.staff, Newbie: newbie }).map(([name, id]) => [id, name]));
  const totals: Record<string, number> = { Arshad: 0, Bilal: 0, Karim: 0, Newbie: 0 };
  for (const line of lines) totals[byName[line.staffId]] += line.amount;
  return totals;
}

const snapshotOf = async (businessDate: string) =>
  (await db.select().from(daySnapshots).where(eq(daySnapshots.businessDate, businessDate)))[0];

async function setPay(name: string, pay: { dailyWage?: number; commissionRate?: number; active?: boolean }) {
  const id = name === "Newbie" ? newbie : salon.staff[name];
  const current = {
    Arshad: { dailyWage: 0, commissionRate: 10 },
    Bilal: { dailyWage: 700, commissionRate: 0 },
    Karim: { dailyWage: 500, commissionRate: 0 },
  }[name as "Arshad" | "Bilal" | "Karim"];
  await saveStaff(salon.owner, {
    id,
    name,
    payType: 3,
    salary: 0,
    dailyWage: pay.dailyWage ?? current.dailyWage,
    commissionRate: pay.commissionRate ?? current.commissionRate,
    active: pay.active ?? true,
  });
}

beforeAll(async () => {
  salon = await seedSalon({ firstDay: { date: FOURTH, openingCash: 10_000 } });

  // 4 Sep: five Facials by Arshad, Rs 6,250 cash; Bilal and Karim present.
  for (let i = 0; i < 5; i++) {
    await ringUp(salon.manager, [{ serviceId: salon.services.Facial, staffId: salon.staff.Arshad }], { cash: 1_250 });
  }
  await closeToday(salon.manager);
  await startNextDay(salon.manager);

  // The rates change after 4 Sep is closed.
  await setPay("Bilal", { dailyWage: 900 });
  await setPay("Arshad", { commissionRate: 20 });
  await setPay("Karim", { active: false });
  newbie = await addStaff(salon.owner, { name: "Newbie", payType: 3, dailyWage: 1_000, commissionRate: 0 });
});

describe("closing a day", () => {
  it("settles it on the pay in force and saves that pay with the day's staff list", async () => {
    // Read before the correction below: 4 Sep as it closed.
    const rows = await db.select().from(attendance).where(eq(attendance.businessDate, FOURTH));
    const pay = Object.fromEntries(rows.map((row) => [row.staffId, row]));

    expect(rows).toHaveLength(3);
    expect(pay[salon.staff.Arshad]).toMatchObject({ present: true, payType: 3, dailyWage: 0, commissionRate: 10 });
    expect(pay[salon.staff.Bilal]).toMatchObject({ present: true, dailyWage: 700 });
    expect(pay[salon.staff.Karim]).toMatchObject({ present: true, dailyWage: 500 });
    expect(await openDay()).toBe(FIFTH);
  });
});

describe("a correction to a closed day, after the rates changed", () => {
  it("is settled on that day's own staff list and pay (QA-04)", async () => {
    const before = await snapshotOf(FOURTH);
    expect(await earnedOn(FOURTH)).toEqual({ Arshad: 625, Bilal: 700, Karim: 500, Newbie: 0 });

    const [bill] = await db.select().from(bills).where(eq(bills.businessDate, FOURTH)).orderBy(bills.billNo).limit(1);
    await cancelBill(salon.owner, bill.id, "Customer never paid");

    expect(await earnedOn(FOURTH)).toEqual({ Arshad: 500, Bilal: 700, Karim: 500, Newbie: 0 });
    // The drawer was counted once, by hand: the count stays, and the Rs 1,250 the
    // books no longer expect shows as a difference.
    const after = await snapshotOf(FOURTH);
    expect(after).toMatchObject({ sale: 5_000, staffEarned: 1_700, countedCash: before.countedCash, difference: 1_250 });
    // The old closing record is kept, with its code.
    const [archived] = await db.select().from(daySnapshotHistory).where(eq(daySnapshotHistory.businessDate, FOURTH));
    expect(archived).toMatchObject({ securityCode: before.securityCode, reopenReason: "Corrected: bill #1 cancelled" });
    expect(after.securityCode).not.toBe(before.securityCode);
  });
});

describe("reopening a day and closing it again", () => {
  it("closes it on the pay in force then, and writes its staff list again", async () => {
    // 5 Sep: one Haircut by Arshad at 20%; Bilal, Newbie present; Karim has left.
    await ringUp(salon.manager, [{ serviceId: salon.services.Haircut, staffId: salon.staff.Arshad }], { cash: 500 });
    await closeToday(salon.manager);
    expect(await earnedOn(FIFTH)).toEqual({ Arshad: 100, Bilal: 900, Karim: 0, Newbie: 1_000 });

    await setPay("Bilal", { dailyWage: 1_000 });
    await reopenDay(salon.owner, "Bilal's raise starts today");
    expect(await db.select().from(attendance).where(eq(attendance.businessDate, FIFTH))).toEqual([]);
    expect(await earnedOn(FIFTH)).toEqual({ Arshad: 0, Bilal: 0, Karim: 0, Newbie: 0 });

    await closeToday(salon.manager, { attendance: { [newbie]: false } });

    expect(await earnedOn(FIFTH)).toEqual({ Arshad: 100, Bilal: 1_000, Karim: 0, Newbie: 0 });
    const rows = await db.select().from(attendance).where(eq(attendance.businessDate, FIFTH));
    expect(rows.map((row) => [row.staffId, row.present, row.dailyWage]).sort()).toEqual(
      [
        [salon.staff.Arshad, true, 0],
        [salon.staff.Bilal, true, 1_000],
        [newbie, false, 1_000],
      ].sort(),
    );
  });

  it("leaves every closed day's security code checking out", async () => {
    expect(await checkDayCodes(FOURTH, FIFTH)).toEqual([
      expect.objectContaining({ businessDate: FOURTH, ok: true }),
      expect.objectContaining({ businessDate: FIFTH, ok: true }),
    ]);
  });

  it("refuses to reopen a day once the next one has started", async () => {
    await startNextDay(salon.manager);
    await expect(reopenDay(salon.owner, "Too late")).rejects.toThrow("This day is already open.");
    const [fifth] = await db.select().from(daySnapshots).where(and(eq(daySnapshots.businessDate, FIFTH)));
    expect(fifth).toBeDefined();
  });
});
