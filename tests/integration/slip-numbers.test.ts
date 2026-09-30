import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { POST as syncClose } from "@/app/api/offline/close/route";
import { POST as syncBill } from "@/app/api/offline/sync/route";
import { db } from "@/db";
import { offlineWorkOn } from "@/db/queries/offline-work";
import { auditLog, bills } from "@/db/schema";
import { cancelBillAction, createBillAction, editBillAction } from "@/features/billing/actions";
import { getDailyReport } from "@/features/daily-report/queries";
import { reviewClose, startNextDay } from "@/features/day-close/service";
import { getOverview } from "@/features/overview/queries";
import { repeatedSlipNos, SLIP_NO_REPEATED } from "@/lib/offline/slip";
import { asRequest, SITE } from "./request";
import { closeToday, seedSalon, signIn, type Salon } from "./salon";

/**
 * P7.10 (QA-28, QA-37): a slip's number on two bills never goes unnoticed,
 * and a second computer working offline is named to the Owner. The same
 * paper slip saved twice used to go through without a word; two computers
 * offline both handed out `T-1`; and one computer's close arriving first left
 * the other's bills refused with nothing to say why.
 */
let salon: Salon;
let manager: string;
let owner: string;

const FIRST = "2026-09-01";
const SECOND = "2026-09-02";
const KXR = { id: randomUUID(), code: "KXR" };
const MTP = { id: randomUUID(), code: "MTP" };

beforeAll(async () => {
  salon = await seedSalon({ firstDay: { date: FIRST, openingCash: 5_000 } });
  manager = await signIn(salon.manager);
  owner = await signIn(salon.owner);
});

/** A Haircut paid in cash, as the billing screen sends it. */
const haircut = (extra: Record<string, unknown> = {}) => ({
  lines: [{ serviceId: salon.services.Haircut, staffId: salon.staff.Arshad, dealId: null, dealInstanceId: null }],
  customer: null,
  cash: 500,
  online: 0,
  clientId: randomUUID(),
  ...extra,
});

async function save(cookie: string, input: Record<string, unknown>) {
  asRequest(cookie);
  return createBillAction(input);
}

const billOf = async (clientId: string) => (await db.select().from(bills).where(eq(bills.clientId, clientId)))[0];

const postJson = (handler: (request: Request) => Promise<Response>, body: unknown) =>
  handler(
    new Request(`http://${SITE}/api/offline`, {
      method: "POST",
      headers: { "content-type": "application/json", host: SITE, origin: `http://${SITE}` },
      body: JSON.stringify(body),
    }),
  );

function offlineBill(businessDate: string, bookNo: string, device?: typeof KXR) {
  return {
    v: 1,
    clientId: randomUUID(),
    businessDate,
    catalogVersion: null,
    madeAt: new Date().toISOString(),
    madeBy: "manager",
    ...(device ? { device } : {}),
    bill: { ...haircut(), clientId: undefined, bookNo },
  };
}

describe("a paper slip's number already on a bill (QA-28)", () => {
  it("is refused once, naming the bill, however it is typed", async () => {
    const first = await save(manager, haircut({ bookNo: "B-2/45" }));
    expect(first).toMatchObject({ ok: true });

    const again = await save(manager, haircut({ bookNo: "b-2 / 45" }));

    expect(again).toEqual({
      ok: false,
      code: SLIP_NO_REPEATED,
      error:
        "Bill book number b-2 / 45 is already on bill #1 today. If this is the same slip, it is in already; if it is another slip with the same number, save it anyway.",
    });
  });

  it("is saved when the counter says it is another slip, and the audit log names the first bill", async () => {
    const input = haircut({ bookNo: "B-2/45", repeatBookNo: true });

    expect(await save(manager, input)).toMatchObject({ ok: true });

    const saved = await billOf(input.clientId);
    const [audit] = await db.select().from(auditLog).where(eq(auditLog.target, `bill #${saved.billNo}`));
    expect(audit.after).toMatchObject({ repeatedBookNo: { billNo: 1, businessDate: FIRST } });
  });

  it("is free again once the bill that had it is cancelled", async () => {
    const input = haircut({ bookNo: "B-3/1" });
    await save(manager, input);
    asRequest(manager);
    await cancelBillAction({ billId: (await billOf(input.clientId)).id, reason: "Rung up by mistake" });

    expect(await save(manager, haircut({ bookNo: "B-3/1" }))).toMatchObject({ ok: true });
  });

  it("is handed on by a correction, which needs no word from the counter", async () => {
    const input = haircut({ bookNo: "B-3/2" });
    await save(manager, input);
    asRequest(owner);

    const corrected = await editBillAction({
      ...haircut({ bookNo: "B-3/2" }),
      billId: (await billOf(input.clientId)).id,
      reason: "Wrong staff member",
    });

    expect(corrected).toMatchObject({ ok: true });
  });

  it("is looked for on every day; a T- number only on its own day", async () => {
    await save(manager, haircut({ bookNo: "T-KXR-1" }));
    await closeToday(salon.manager);
    await startNextDay(salon.manager);

    const paper = await save(manager, haircut({ bookNo: "B-3/2" }));
    const temp = await save(manager, haircut({ bookNo: "T-KXR-1" }));

    expect(paper).toMatchObject({ ok: false, code: SLIP_NO_REPEATED, error: expect.stringContaining("of 1 Sep 2026") });
    expect(temp).toMatchObject({ ok: true });
  });

  it("never refuses a bill made offline — its slip is in the customer's hand — but records it", async () => {
    asRequest(manager);
    const sent = offlineBill(SECOND, "B-3/2");

    const response = await postJson(syncBill, sent);

    expect(response.status).toBe(200);
    const saved = await billOf(sent.clientId);
    const [audit] = await db.select().from(auditLog).where(eq(auditLog.target, `bill #${saved.billNo}`));
    expect(audit.after).toMatchObject({ repeatedBookNo: { businessDate: FIRST } });
  });

  it("is marked on the day's list, where two bills in force share it", async () => {
    // The first day: B-2/45 twice. B-3/1's first bill is cancelled, B-3/2's corrected — one in force each.
    expect([...repeatedSlipNos((await getDailyReport(FIRST))!.bills)]).toEqual(["B-2/45"]);
    // The second day's B-3/2 repeats the first day's, not one of its own.
    expect(repeatedSlipNos((await getDailyReport(SECOND))!.bills).size).toBe(0);
  });
});

describe("the computer an offline bill was made on (QA-37)", () => {
  it("goes into the audit log with the day and the bill's id", async () => {
    asRequest(manager);
    const sent = offlineBill(SECOND, "T-KXR-2", KXR);

    expect((await postJson(syncBill, sent)).status).toBe(200);

    const saved = await billOf(sent.clientId);
    const [audit] = await db.select().from(auditLog).where(eq(auditLog.target, `bill #${saved.billNo}`));
    expect(audit.after).toMatchObject({ offline: { businessDate: SECOND, clientId: sent.clientId, device: KXR } });
  });

  it("is refused when it is not a proper tag", async () => {
    asRequest(manager);
    const response = await postJson(syncBill, { ...offlineBill(SECOND, "T-KXR-3"), device: { id: KXR.id, code: "kx" } });
    expect(response.status).toBe(422);
  });

  it("one computer offline on a day is nothing to tell", async () => {
    expect((await offlineWorkOn([SECOND])).get(SECOND)).toEqual([{ id: KXR.id, code: "KXR", saved: 1, refused: 0 }]);
    expect((await getDailyReport(SECOND))!.offlineNote).toBeNull();
  });
});

describe("a second computer offline on the open day", () => {
  it("is named on the day's report and on the Owner's Overview", async () => {
    asRequest(manager);
    expect((await postJson(syncBill, offlineBill(SECOND, "T-MTP-1", MTP))).status).toBe(200);

    const report = await getDailyReport(SECOND);
    expect(report!.offlineNote).toMatch(/^Two computers worked offline on this day: KXR \(1 saved\) and MTP \(1 saved\)\./);
    const overview = await getOverview();
    expect(overview!.alerts).toContainEqual(
      expect.objectContaining({ tone: "warn", text: expect.stringMatching(/^Two computers worked offline on 2 Sep 2026: /) }),
    );
  });

  it("closing the day on one computer: the other's bill arriving after is refused, and says why", async () => {
    asRequest(manager);
    const { expected } = await reviewClose({ attendance: {}, payouts: {}, counted: 0 });
    const close = {
      v: 1,
      type: "close",
      clientId: randomUUID(),
      businessDate: SECOND,
      madeAt: new Date().toISOString(),
      madeBy: "manager",
      device: KXR,
      close: { attendance: {}, payouts: {}, counted: expected, reason: null, expected },
    };
    expect((await postJson(syncClose, close)).status).toBe(200);

    const late = await postJson(syncBill, offlineBill(SECOND, "T-MTP-2", MTP));
    const body = await late.json();

    expect(late.status).toBe(422);
    expect(body.reason).toMatch(
      /^No business day is open\. Ask the Owner to open one\. 2 Sep 2026 was closed while this computer was offline, so its count did not include this bill\./,
    );
    const work = (await offlineWorkOn([SECOND])).get(SECOND)!;
    expect(work.find((device) => device.code === "MTP")).toMatchObject({ saved: 1, refused: 1 });
    expect(work.find((device) => device.code === "KXR")).toMatchObject({ saved: 2, refused: 0 });
  });
});
