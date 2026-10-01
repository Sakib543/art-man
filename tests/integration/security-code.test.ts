import { and, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { cancelBill } from "@/db/bill-cancel";
import { checkDayCodes } from "@/db/day-code";
import { allowFinancialEdit } from "@/db/financial-edit";
import { billLines, bills } from "@/db/schema";
import { getSecurityCodes } from "@/features/security-codes/queries";
import { asOwner } from "./owner";
import { closeAndStartNext, ringUp, seedSalon, type Salon } from "./salon";

/**
 * P7.8 (QA-27, QA-05): a closed day's security code comes out of its records
 * the same way every time, a correction made the proper way leaves every day
 * checking out — the next day included — and a record changed behind the
 * app's back is caught. The audit's scenario: three closed days, the first
 * with a bill whose lines are out of name order.
 */
let salon: Salon;

const codesOk = async () => (await checkDayCodes("2026-09-01", "2026-09-03")).map((day) => [day.businessDate, day.ok]);

/** A change made the way the developer's edit makes one — through the hatch, not through the app's rules. */
async function throughTheHatch(statement: ReturnType<typeof sql>) {
  await db.transaction(async (tx) => {
    await allowFinancialEdit(tx);
    await tx.execute(statement);
  });
}

beforeAll(async () => {
  salon = await seedSalon({ firstDay: { date: "2026-09-01", openingCash: 5_000 } });
  const { manager, services, staff } = salon;

  await ringUp(
    manager,
    [
      { serviceId: services.Shave, staffId: staff.Bilal },
      { serviceId: services.Facial, staffId: staff.Arshad },
      { serviceId: services.Haircut, staffId: staff.Karim },
    ],
    { cash: 2_000 },
  );
  await closeAndStartNext(manager);
  await ringUp(manager, [{ serviceId: services.Haircut, staffId: staff.Arshad }], { cash: 500 });
  await closeAndStartNext(manager);
  await ringUp(manager, [{ serviceId: services.Shave, staffId: staff.Bilal }], { cash: 250 });
  await closeAndStartNext(manager);
});

describe("the security code", () => {
  it("checks out on three days just closed", async () => {
    expect(await codesOk()).toEqual([
      ["2026-09-01", true],
      ["2026-09-02", true],
      ["2026-09-03", true],
    ]);
  });

  it("still checks out on every day after the Owner cancels a bill in a closed day — the next day included (QA-05)", async () => {
    const [bill] = await db.select().from(bills).where(eq(bills.businessDate, "2026-09-02"));
    await cancelBill(salon.owner, bill.id, "Customer disputed it");

    expect(await codesOk()).toEqual([
      ["2026-09-01", true],
      ["2026-09-02", true],
      ["2026-09-03", true],
    ]);
  });

  it("does not move when a line is rewritten unchanged, which changes the order the database returns it in (QA-27)", async () => {
    const [bill] = await db.select().from(bills).where(eq(bills.businessDate, "2026-09-01"));
    await throughTheHatch(sql`update bill_lines set amount = amount where bill_id = ${bill.id} and name = 'Shave'`);

    expect(await codesOk()).toEqual([
      ["2026-09-01", true],
      ["2026-09-02", true],
      ["2026-09-03", true],
    ]);
  });

  it("is what the Owner's Security codes screen shows", async () => {
    const screen = await getSecurityCodes("2026-09");
    expect(screen?.days.map((day) => day.ok)).toEqual([true, true, true]);
  });

  it("catches a line's amount changed behind the app's back", async () => {
    const [bill] = await db.select().from(bills).where(eq(bills.businessDate, "2026-09-01"));
    await throughTheHatch(sql`update bill_lines set amount = 300 where bill_id = ${bill.id} and name = 'Shave'`);

    expect((await codesOk())[0]).toEqual(["2026-09-01", false]);
    const [line] = await db.select().from(billLines).where(and(eq(billLines.billId, bill.id), eq(billLines.name, "Shave")));
    expect(line.amount).toBe(300);
  });

  it("catches a closed day's staff list changed behind the app's back — the attendance its wages come from (P7.14)", async () => {
    // Its trigger refuses any change, so only an owner switching it off could make one.
    await asOwner(async (client) => {
      await client.query("begin");
      await client.query("alter table attendance disable trigger attendance_guard");
      await client.query("update attendance set present = not present where business_date = '2026-09-02'");
      await client.query("alter table attendance enable trigger attendance_guard");
      await client.query("commit");
    });

    expect(await codesOk()).toEqual([
      ["2026-09-01", false],
      ["2026-09-02", false],
      ["2026-09-03", true],
    ]);
  });

  it("catches a discount written onto a closed day's bill (P7.14)", async () => {
    await throughTheHatch(sql`update bills set discount = 50, discount_reason = 'Regular' where business_date = '2026-09-03'`);
    expect((await codesOk())[2]).toEqual(["2026-09-03", false]);
  });
});
