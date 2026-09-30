import { beforeAll, describe, expect, it } from "vitest";
import { GET as dayCopyRoute } from "@/app/api/offline/day/route";
import { localDayOf, reviewLocally } from "@/features/day-close/offline-close";
import { getDayCloseData } from "@/features/day-close/queries";
import { reviewClose } from "@/features/day-close/service";
import { entrySchema } from "@/features/folders/schemas";
import { addEntry } from "@/features/folders/service";
import { saveStaff } from "@/features/staff-rates/service";
import type { DayCopy } from "@/lib/offline/day";
import { asRequest } from "./request";
import { ringUp, seedSalon, signIn, type Salon } from "./salon";

/**
 * P7.13 (QA-08): the copy of the open day, which any role signed in on the
 * counter fetches, carries only what closing the day needs — the pay and khata
 * of the staff the close lists, of the pay only the day's part — and still
 * enough that expected cash worked out from it is the server's. Before, every
 * staff member's salary, wage and rate went to whoever asked.
 */
const DAY = "2026-09-29";
// Salaries no part of a day needs, odd enough to find in any payload.
const SHERRY_SALARY = 23_456;
const KAMRAN_SALARY = 34_567;

let salon: Salon;
let raw: string;
let copy: DayCopy;

async function switchOff(id: string, name: string, dailyWage: number, commissionRate: number) {
  await saveStaff(salon.owner, { id, name, payType: 3, salary: 0, dailyWage, commissionRate, active: false });
}

beforeAll(async () => {
  salon = await seedSalon({
    firstDay: { date: DAY, openingCash: 5_000 },
    staff: [
      { name: "Arshad", payType: 3, dailyWage: 600, commissionRate: 10 },
      { name: "Sherry", payType: 2, salary: SHERRY_SALARY, commissionRate: 20 },
      { name: "Kamran", payType: 1, salary: KAMRAN_SALARY },
      { name: "Hamid", payType: 3, dailyWage: 800, commissionRate: 5 },
      { name: "Nadeem", payType: 3, dailyWage: 900 },
    ],
  });
  await ringUp(salon.manager, [{ serviceId: salon.services.Haircut, staffId: salon.staff.Hamid }], { cash: 500 });
  await ringUp(salon.manager, [{ serviceId: salon.services.Facial, staffId: salon.staff.Sherry }], { online: 1_250 });
  await addEntry(salon.manager, entrySchema.parse({ kind: "staff_advance", amount: 300, staffId: salon.staff.Arshad }));
  await addEntry(salon.manager, entrySchema.parse({ kind: "expense", amount: 200, description: "Towels", paidFrom: "drawer" }));
  // Hamid is switched off after a bill today; Nadeem with no work on the day.
  await switchOff(salon.staff.Hamid, "Hamid", 800, 5);
  await switchOff(salon.staff.Nadeem, "Nadeem", 900, 0);

  asRequest(await signIn(salon.manager));
  const response = await dayCopyRoute();
  expect(response.status).toBe(200);
  raw = await response.text();
  copy = JSON.parse(raw) as DayCopy;
});

describe("the offline day copy, as the Manager gets it", () => {
  it("holds no salary at all (QA-08)", () => {
    expect(raw).not.toMatch(/salary/i);
    expect(raw).not.toContain(String(SHERRY_SALARY));
    expect(raw).not.toContain(String(KAMRAN_SALARY));
  });

  it("holds pay and khata only for the staff the close lists: the active ones, and one switched off with work today", () => {
    const listed = [salon.staff.Arshad, salon.staff.Sherry, salon.staff.Kamran, salon.staff.Hamid].sort();
    expect(Object.keys(copy.close!.pay).sort()).toEqual(listed);
    expect(Object.keys(copy.close!.khata).sort()).toEqual(listed);
    // Names are still there for everyone, for the register's columns.
    expect(copy.staff.map((member) => member.name)).toEqual(["Arshad", "Sherry", "Kamran", "Hamid", "Nadeem"]);
  });

  it("holds of each pay only what its type pays", () => {
    const pay = copy.close!.pay;
    expect(pay[salon.staff.Arshad]).toEqual({ payType: 3, dailyWage: 600, commissionRate: 10 });
    expect(pay[salon.staff.Sherry]).toEqual({ payType: 2, dailyWage: 0, commissionRate: 20 });
    expect(pay[salon.staff.Kamran]).toEqual({ payType: 1, dailyWage: 0, commissionRate: 0 });
    expect(pay[salon.staff.Hamid]).toEqual({ payType: 3, dailyWage: 800, commissionRate: 5 });
    expect(copy.close!.khata[salon.staff.Arshad]).toBe(-300);
  });

  it("is still enough to close the day: the same staff rows as online, and the server's expected cash", async () => {
    const local = localDayOf(copy, [], DAY);
    if (!local.ok) throw new Error(local.reason);
    const online = await getDayCloseData();
    if (online.state !== "open") throw new Error(`the day is ${online.state}`);
    expect(local.day.staff).toEqual(online.staff);

    const count = { attendance: { [salon.staff.Hamid]: false }, payouts: { [salon.staff.Arshad]: 600 }, counted: 0 };
    const here = reviewLocally(local.day, count);
    const server = await reviewClose(count);
    // 5,000 opening + 500 cash − 300 advance − 200 towels − 600 paid.
    expect(here.expected).toBe(4_400);
    expect(here).toEqual(server);
  });
});

describe("the online Day close", () => {
  it("gives the browser no salary either", async () => {
    const data = await getDayCloseData();
    expect(JSON.stringify(data)).not.toMatch(/salary/i);
    expect(JSON.stringify(data)).not.toContain(String(SHERRY_SALARY));
  });
});
