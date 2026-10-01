import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { cancelBill } from "@/db/bill-cancel";
import { getDayBills } from "@/db/queries/day-bills";
import { deals, services } from "@/db/schema";
import { getBillingData, getBillForEdit } from "@/features/billing/queries";
import { createBillSchema, editBillSchema } from "@/features/billing/schemas";
import { createBill, editBill } from "@/features/billing/service";
import { changeOwnUsername } from "@/features/developer/service";
import { saveDeal, saveService } from "@/features/staff-rates/service";
import { createUserAction } from "@/features/users/actions";
import { auth } from "@/lib/auth/server";
import { asRequest } from "./request";
import { ringUp, seedSalon, signIn, type Salon } from "./salon";

/**
 * P7.17's fixes that live on the server: a bill's lines keep the order they
 * had on the slip (QA-32); a username is what Better Auth will let sign in
 * (QA-21); a deal of services that all list at 0 is shared equally instead
 * of failing (QA-13).
 */
const DAY = "2026-09-29";
let salon: Salon;

beforeAll(async () => {
  salon = await seedSalon({ firstDay: { date: DAY, openingCash: 5_000 } });
});

const linesOf = async (billNo: number) =>
  (await getDayBills(DAY)).find((bill) => bill.billNo === billNo)!.lines.map((line) => line.name);

describe("a bill's lines, in the order they were on the slip (QA-32)", () => {
  // Not in name order, which is what reads fell back to before.
  const cart = () => [
    { serviceId: salon.services.Shave, staffId: salon.staff.Bilal },
    { serviceId: salon.services.Haircut, staffId: salon.staff.Arshad },
    { serviceId: salon.services.Facial, staffId: salon.staff.Karim },
  ];

  it("come back as they were saved — the list a reprint is made from", async () => {
    const saved = await ringUp(salon.manager, cart(), { cash: 2_000 });
    expect(await linesOf(saved.receipt.billNo)).toEqual(["Shave", "Haircut", "Facial"]);
  });

  it("stay in that order on the Owner's edit screen, and on the corrected bill", async () => {
    const saved = await ringUp(salon.manager, cart(), { cash: 2_000 });
    const [bill] = (await getDayBills(DAY)).filter((row) => row.billNo === saved.receipt.billNo);
    const draft = await getBillForEdit(bill.id, (await getBillingData())!);
    expect(draft.ok && draft.lines.map((line) => line.serviceId)).toEqual(cart().map((line) => line.serviceId));

    const corrected = await editBill(
      salon.owner,
      editBillSchema.parse({
        billId: bill.id,
        reason: "Wrong staff",
        lines: cart().map((line) => ({ ...line, dealId: null, dealInstanceId: null, amount: null })),
        customer: null,
        cash: 2_000,
        online: 0,
        clientId: null,
      }),
    );
    expect(await linesOf(corrected.receipt.billNo)).toEqual(["Shave", "Haircut", "Facial"]);
  });

  it("are reversed line for line, in the same order, when the bill is cancelled", async () => {
    const saved = await ringUp(salon.manager, cart(), { cash: 2_000 });
    const [bill] = (await getDayBills(DAY)).filter((row) => row.billNo === saved.receipt.billNo);
    await cancelBill(salon.manager, bill.id, "Customer left");
    const reversal = (await getDayBills(DAY)).find((row) => row.reversesBillId === bill.id)!;
    expect(reversal.lines.map((line) => line.amount)).toEqual([-250, -500, -1250]);
  });
});

describe("a username Better Auth will let sign in (QA-21)", () => {
  it("is refused with a hyphen in words, where it used to be 'Something went wrong'", async () => {
    asRequest(await signIn(salon.owner));
    const result = await createUserAction({ username: "qa-owner", name: "QA Owner", role: "manager", password: "a-long-password-1" });
    expect(result).toEqual({ ok: false, error: "Use letters, numbers, a dot or an underscore — nothing else." });
  });

  it("is refused at 31 characters, which Better Auth would never let sign in", async () => {
    asRequest(await signIn(salon.owner));
    const result = await createUserAction({ username: "a".repeat(31), name: "Long Name", role: "manager", password: "a-long-password-1" });
    expect(result).toMatchObject({ ok: false, error: "The username must be 30 characters or fewer." });
  });

  it("signs in at 30 characters, the most both allow", async () => {
    asRequest(await signIn(salon.owner));
    const username = "a".repeat(30);
    expect(await createUserAction({ username, name: "Longest", role: "manager", password: "a-long-password-1" })).toMatchObject({ ok: true });
    const response = await auth.api.signInUsername({ body: { username, password: "a-long-password-1" }, asResponse: true });
    expect(response.status).toBe(200);
  });

  it("cannot be taken by the developer for themselves with a hyphen — they could never sign in again", async () => {
    await expect(changeOwnUsername(salon.developer, "dev-1")).rejects.toThrow("Use letters, numbers, a dot or an underscore");
  });
});

describe("a deal whose services all list at 0 (QA-13)", () => {
  it("is shared equally between its services, and the bill is saved", async () => {
    await saveService(salon.owner, { name: "Wash", category: "Hair", price: 0, maxPrice: null, minutes: 10, active: true });
    await saveService(salon.owner, { name: "Steam", category: "Hair", price: 0, maxPrice: null, minutes: 10, active: true });
    const ids = Object.fromEntries((await db.select({ id: services.id, name: services.name }).from(services)).map((row) => [row.name, row.id]));
    await saveDeal(salon.owner, { name: "Spa", price: 1_000, serviceIds: [ids.Wash, ids.Steam], active: true });
    const [deal] = await db.select({ id: deals.id }).from(deals).where(eq(deals.name, "Spa"));

    const saved = await createBill(
      salon.manager,
      createBillSchema.parse({
        lines: [
          { serviceId: ids.Wash, staffId: salon.staff.Arshad, dealId: deal.id, dealInstanceId: "spa-1", amount: null },
          { serviceId: ids.Steam, staffId: salon.staff.Bilal, dealId: deal.id, dealInstanceId: "spa-1", amount: null },
        ],
        customer: null,
        cash: 1_000,
        online: 0,
        clientId: null,
      }),
    );
    expect(saved.receipt.lines.map((line) => line.amount)).toEqual([500, 500]);
  });
});
