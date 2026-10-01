import { beforeAll, describe, expect, it } from "vitest";
import { entrySchema } from "@/features/folders/schemas";
import { addEntry } from "@/features/folders/service";
import { closeMonth } from "@/features/month-close/service";
import { getKhataData, type KhataData } from "@/features/staff-khata/queries";
import { closeAndStartNext, ringUp, seedSalon, type Salon } from "./salon";

/**
 * P7.15 (QA-42): Staff khata shows one month at a time — the balance brought
 * forward from every earlier line, the month's own lines, and the balance at
 * the month's end — instead of a karigar's whole ledger, which was 1.4 MB of
 * page after a year. Two days are closed, 31 August and 1 September; 2
 * September is open.
 */
let salon: Salon;

beforeAll(async () => {
  salon = await seedSalon({ firstDay: { date: "2026-08-31", openingCash: 5_000 } });
  const { manager, services, staff } = salon;

  // 31 August: Bilal's wage (700), a 300 advance, 400 paid at close.
  await addEntry(manager, entrySchema.parse({ kind: "staff_advance", amount: 300, staffId: staff.Bilal }));
  await ringUp(manager, [{ serviceId: services.Haircut, staffId: staff.Arshad }], { cash: 500 });
  await closeAndStartNext(manager, { payouts: { [staff.Bilal]: 400 } });
  // 1 September: Bilal's wage again, 200 paid at close.
  await ringUp(manager, [{ serviceId: services.Shave, staffId: staff.Bilal }], { cash: 250 });
  await closeAndStartNext(manager, { payouts: { [staff.Bilal]: 200 } });
});

const bilal = (month?: string) => getKhataData(salon.staff.Bilal, month) as Promise<KhataData>;

describe("Staff khata, one month at a time", () => {
  it("offers the months with a business day, newest first, and opens on the latest day's", async () => {
    const data = await bilal();
    expect(data.months.map((choice) => choice.month)).toEqual(["2026-09", "2026-08"]);
    expect(data).toMatchObject({ month: "2026-09", monthLabel: "September 2026", currentMonth: true, monthClosed: false });
  });

  it("shows only the month's own lines, after the balance brought forward from before it", async () => {
    const august = await bilal("2026-08");
    expect(august.broughtForward).toBe(0);
    expect(new Set(august.ledger.map((row) => row.businessDate))).toEqual(new Set(["2026-08-31"]));
    // 700 earned, 300 taken in advance, 400 paid: nothing left.
    expect(august.closingBalance).toBe(0);
    expect(august).toMatchObject({ currentMonth: false });

    const september = await bilal("2026-09");
    expect(september.broughtForward).toBe(august.closingBalance);
    expect(new Set(september.ledger.map((row) => row.businessDate))).toEqual(new Set(["2026-09-01"]));
    expect(september.ledger[0].balance).toBe(september.broughtForward + september.ledger[0].amount);
    // 700 earned, 200 paid.
    expect(september.closingBalance).toBe(500);
  });

  it("ends the latest month on the balance today, which the staff list shows", async () => {
    const data = await bilal("2026-09");
    expect(data.closingBalance).toBe(data.selected.balance);
    expect(data.staff.find((member) => member.id === salon.staff.Bilal)?.balance).toBe(500);
  });

  it("adds every month up to the whole khata: each month's end is the next one's start", async () => {
    const [august, september] = await Promise.all([bilal("2026-08"), bilal("2026-09")]);
    const lines = [...august.ledger, ...september.ledger].reduce((sum, row) => sum + row.amount, 0);
    expect(lines).toBe(september.closingBalance);
  });

  it("falls back to the latest day's month for a month with no business day, or one that is not a month", async () => {
    expect((await bilal("2025-01")).month).toBe("2026-09");
    expect((await bilal("not-a-month")).month).toBe("2026-09");
  });

  it("says a closed month is final, month by month", async () => {
    await closeMonth(salon.owner, "2026-08");
    expect((await bilal("2026-08")).monthClosed).toBe(true);
    expect((await bilal("2026-09")).monthClosed).toBe(false);
  });
});
