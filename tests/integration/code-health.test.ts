import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { auditLog, cashEntries, deals, services } from "@/db/schema";
import { changeOwnerPin } from "@/features/account/service";
import { createBillSchema } from "@/features/billing/schemas";
import { createBill } from "@/features/billing/service";
import { voidEntry } from "@/features/folders/service";
import { saveDeal, saveService } from "@/features/staff-rates/service";
import { closeAndStartNext, seedSalon, warmPool, type Salon } from "./salon";

/**
 * P7.18's fixes that live on the server: a payment made at Day close cannot
 * be cancelled from Daily folders (QA-17); the Owner's own password is checked
 * one try at a time, so tries sent at once cannot pass the lock (found in P7.1);
 * a deal's services are read in one fixed order, so a tie's spare rupee goes to
 * the same one every time (QA-18).
 */
let salon: Salon;

beforeAll(async () => {
  salon = await seedSalon({ firstDay: { date: "2026-09-29", openingCash: 5_000 } });
});

describe("a payment made at Day close (QA-17)", () => {
  it("is not cancelled from Daily folders — only reopening the day undoes it, with its khata line", async () => {
    await closeAndStartNext(salon.manager, { payouts: { [salon.staff.Bilal]: 700 } });
    const [payment] = await db
      .select()
      .from(cashEntries)
      .where(and(eq(cashEntries.kind, "staff_payment"), eq(cashEntries.staffId, salon.staff.Bilal)));

    await expect(voidEntry(salon.owner, { entryId: payment.id, reason: "Paid twice" })).rejects.toThrow(
      "A payment made at Day close is undone by reopening the day",
    );
    expect(await db.select().from(cashEntries).where(eq(cashEntries.voidsEntryId, payment.id))).toEqual([]);
  });
});

describe("the Owner's own password (found in P7.1)", () => {
  it("takes five wrong tries however many are sent at once", async () => {
    await warmPool();
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => changeOwnerPin(salon.owner, { password: "not-the-password", newPin: "1357" })),
    );
    const reasons = results.map((result) => (result.status === "rejected" ? String(result.reason?.message) : "saved"));

    const wrong = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, "password.wrong"), eq(auditLog.target, salon.owner.id)));
    expect(wrong).toHaveLength(5);
    expect(reasons.filter((reason) => reason === "That password is not correct.")).toHaveLength(5);
    expect(reasons.filter((reason) => reason.startsWith("Too many wrong passwords"))).toHaveLength(15);
  });
});

describe("a deal whose services cost the same (QA-18)", () => {
  it("gives the spare rupee to the same service, edited or not — the one the menu lists first", async () => {
    await saveService(salon.owner, { name: "Massage", category: "Hair", price: 600, maxPrice: null, minutes: 20, active: true });
    await saveService(salon.owner, { name: "Mask", category: "Hair", price: 600, maxPrice: null, minutes: 20, active: true });
    const ids = Object.fromEntries((await db.select({ id: services.id, name: services.name }).from(services)).map((row) => [row.name, row.id]));

    const ringUpDeal = async () => {
      const [deal] = await db.select({ id: deals.id }).from(deals).where(eq(deals.name, "Relax"));
      const saved = await createBill(
        salon.manager,
        createBillSchema.parse({
          lines: [
            { serviceId: ids.Mask, staffId: salon.staff.Arshad, dealId: deal.id, dealInstanceId: "relax", amount: null },
            { serviceId: ids.Massage, staffId: salon.staff.Bilal, dealId: deal.id, dealInstanceId: "relax", amount: null },
          ],
          customer: null,
          cash: 999,
          online: 0,
          clientId: null,
        }),
      );
      return Object.fromEntries(saved.receipt.lines.map((line) => [line.name, line.amount]));
    };

    await saveDeal(salon.owner, { name: "Relax", price: 999, serviceIds: [ids.Mask, ids.Massage], active: true });
    // Massage was added first, so it is first in the menu, and takes the spare rupee.
    expect(await ringUpDeal()).toEqual({ Massage: 500, Mask: 499 });

    const [deal] = await db.select({ id: deals.id }).from(deals).where(eq(deals.name, "Relax"));
    await saveDeal(salon.owner, { id: deal.id, name: "Relax", price: 999, serviceIds: [ids.Massage, ids.Mask], active: true });
    expect(await ringUpDeal()).toEqual({ Massage: 500, Mask: 499 });
  });
});
