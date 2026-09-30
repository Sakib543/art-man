import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { GET as catalogCopy } from "@/app/api/offline/catalog/route";
import { POST as syncClose } from "@/app/api/offline/close/route";
import { GET as dayCopy } from "@/app/api/offline/day/route";
import { POST as syncFolder } from "@/app/api/offline/folders/route";
import { POST as syncBill } from "@/app/api/offline/sync/route";
import { db } from "@/db";
import { setMaintenance } from "@/db/app-settings";
import { auditLog, bills, businessDays, cashEntries, daySnapshots } from "@/db/schema";
import { reviewClose } from "@/features/day-close/service";
import { asRequest, SITE } from "./request";
import { openDay, seedSalon, signIn, type Salon } from "./salon";

/**
 * The offline outbox's server side (P2.2c–f): the three Route Handlers that
 * take a bill, a folder entry and a day's close made with no internet, and
 * the two copies the counter keeps. The answers are the contract with the
 * browser (`outcomeOf`, `lib/offline/outbox.ts`): 200 saved — once, however
 * often sent — 422 refused and recorded, 401/403/503 kept and sent again.
 */
let salon: Salon;
let cookie: string;
const DAY = "2026-09-29";

beforeAll(async () => {
  salon = await seedSalon({ firstDay: { date: DAY, openingCash: 5_000 } });
  cookie = await signIn(salon.manager);
});

const post = (handler: (request: Request) => Promise<Response>, body: unknown, headers: Record<string, string> = {}) =>
  handler(
    new Request(`http://${SITE}/api/offline`, {
      method: "POST",
      headers: { "content-type": "application/json", host: SITE, origin: `http://${SITE}`, ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const answer = async (response: Response) => ({ status: response.status, body: await response.json() });

function offlineBill(overrides: { clientId?: string; businessDate?: string; cash?: number } = {}) {
  return {
    v: 1,
    clientId: overrides.clientId ?? randomUUID(),
    businessDate: overrides.businessDate ?? DAY,
    catalogVersion: null,
    madeAt: new Date().toISOString(),
    madeBy: "manager",
    bill: {
      lines: [{ serviceId: salon.services.Haircut, staffId: salon.staff.Arshad, dealId: null, dealInstanceId: null, amount: null }],
      customer: null,
      cash: overrides.cash ?? 500,
      online: 0,
      bookNo: "T-1",
    },
  };
}

describe("a bill made offline", () => {
  it("is saved once, however often it is sent", async () => {
    asRequest(cookie);
    const sent = offlineBill();

    const first = await answer(await post(syncBill, sent));
    const again = await answer(await post(syncBill, sent));

    expect(first).toEqual({ status: 200, body: { billNo: 1, alreadySaved: false } });
    expect(again).toEqual({ status: 200, body: { billNo: 1, alreadySaved: true } });
    const saved = await db.select().from(bills).where(eq(bills.clientId, sent.clientId));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ businessDate: DAY, bookNo: "T-1", cash: 500 });
  });

  it("made on another day is refused, and the refusal recorded", async () => {
    asRequest(cookie);
    const sent = offlineBill({ businessDate: "2026-09-28" });

    const refused = await answer(await post(syncBill, sent));

    expect(refused.status).toBe(422);
    expect(refused.body.reason).toMatch(/only saved into the day it was made on/);
    const [record] = await db.select().from(auditLog).where(eq(auditLog.action, "bill.offline-refuse"));
    expect(record).toMatchObject({ target: `offline bill ${sent.clientId}`, success: false });
    expect(await db.select().from(bills).where(eq(bills.clientId, sent.clientId))).toEqual([]);
  });

  it("paid the wrong amount is refused", async () => {
    asRequest(cookie);
    const refused = await answer(await post(syncBill, offlineBill({ cash: 450 })));
    expect(refused.status).toBe(422);
  });

  it("that cannot be read is refused", async () => {
    asRequest(cookie);
    expect(await answer(await post(syncBill, "{not json"))).toEqual({ status: 422, body: { reason: "The bill could not be read" } });
  });

  it("is kept and sent again later — not refused — when the request is from another site, signed out, or in maintenance", async () => {
    const sent = offlineBill();
    asRequest(cookie);
    expect((await post(syncBill, sent, { origin: "http://evil.example" })).status).toBe(403);

    asRequest(null);
    expect((await post(syncBill, sent)).status).toBe(401);

    await setMaintenance(salon.developer.username, true);
    try {
      asRequest(cookie);
      expect((await post(syncBill, sent)).status).toBe(503);
    } finally {
      await setMaintenance(salon.developer.username, false);
    }
    expect(await db.select().from(bills).where(eq(bills.clientId, sent.clientId))).toEqual([]);
  });
});

describe("a folder entry made offline", () => {
  const entry = (kind: string, extra: Record<string, unknown>) => ({
    v: 1,
    type: "folder",
    clientId: randomUUID(),
    businessDate: DAY,
    madeAt: new Date().toISOString(),
    madeBy: "manager",
    entry: { kind, amount: 150, ...extra },
  });

  it("an expense or a staff advance is saved once", async () => {
    asRequest(cookie);
    const expense = entry("expense", { description: "Milk", paidFrom: "drawer" });
    const advance = entry("staff_advance", { staffId: salon.staff.Bilal });

    expect(await answer(await post(syncFolder, expense))).toEqual({ status: 200, body: { alreadySaved: false } });
    expect(await answer(await post(syncFolder, expense))).toEqual({ status: 200, body: { alreadySaved: true } });
    expect(await answer(await post(syncFolder, advance))).toEqual({ status: 200, body: { alreadySaved: false } });
    expect(await db.select().from(cashEntries).where(eq(cashEntries.clientId, expense.clientId))).toHaveLength(1);
  });

  it("the Owner's own cash cannot be made offline — it needs the PIN", async () => {
    asRequest(cookie);
    const refused = await answer(await post(syncFolder, entry("owner_took", { description: "Home", pin: "2468" })));
    expect(refused).toEqual({ status: 422, body: { reason: "Only an expense or a staff advance can be made offline" } });
  });
});

describe("the copies the counter keeps", () => {
  it("the catalog and the open day, for a signed-in role only", async () => {
    asRequest(cookie);
    const catalog = await answer(await catalogCopy());
    const day = await answer(await dayCopy());

    expect(catalog.status).toBe(200);
    expect(catalog.body.catalog.services.map((service: { name: string }) => service.name).sort()).toEqual(["Facial", "Haircut", "Shave"]);
    expect(day.status).toBe(200);
    expect(day.body.businessDate).toBe(DAY);
    expect(day.body.bills).toHaveLength(1);

    asRequest(null);
    expect((await catalogCopy()).status).toBe(401);
    expect((await dayCopy()).status).toBe(401);
  });
});

describe("a day closed offline", () => {
  const close = (expected: number, clientId = randomUUID()) => ({
    v: 1,
    type: "close",
    clientId,
    businessDate: DAY,
    madeAt: new Date().toISOString(),
    madeBy: "manager",
    close: { attendance: {}, payouts: {}, counted: expected, reason: null, expected },
  });

  it("is refused when the server's books expect other cash, and the day stays open", async () => {
    asRequest(cookie);
    const { expected } = await reviewClose({ attendance: {}, payouts: {}, counted: 0 });

    const refused = await answer(await post(syncClose, close(expected + 100)));

    expect(refused.status).toBe(422);
    expect(refused.body.reason).toMatch(/The day's cash changed after it was closed on this computer/);
    expect(await openDay()).toBe(DAY);
  });

  it("closes the day when the books agree, once, and a resend gets the same security code", async () => {
    asRequest(cookie);
    const { expected } = await reviewClose({ attendance: {}, payouts: {}, counted: 0 });
    const sent = close(expected);

    const first = await answer(await post(syncClose, sent));
    const again = await answer(await post(syncClose, sent));

    expect(first.status).toBe(200);
    expect(first.body.alreadySaved).toBe(false);
    expect(first.body.securityCode).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(again).toEqual({ status: 200, body: { securityCode: first.body.securityCode, alreadySaved: true } });
    const [snapshot] = await db.select().from(daySnapshots);
    expect(snapshot).toMatchObject({ businessDate: DAY, securityCode: first.body.securityCode, countedCash: expected });
    const [day] = await db.select().from(businessDays).where(eq(businessDays.businessDate, DAY));
    expect(day.closedAt).not.toBeNull();
  });

  it("after that, nothing more made offline for the day is saved", async () => {
    asRequest(cookie);
    const late = await answer(await post(syncBill, offlineBill()));
    expect(late.status).toBe(422);
    expect(late.body.reason).toMatch(/No business day is open/);
  });
});
