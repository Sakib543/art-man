import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { auditLog, cashEntries } from "@/db/schema";
import { resetPin } from "@/features/developer/service";
import { addEntryAction, voidEntryAction } from "@/features/folders/actions";
import { setUserActive } from "@/features/users/service";
import { asRequest } from "./request";
import { makeAccount, OWNER_PIN, seedSalon, signIn, warmPool, type Salon } from "./salon";

/**
 * P7.1 (QA-02 Critical, QA-07, QA-10): the Owner's own cash — taken from the
 * drawer or added to it — is cancelled only with the Owner's PIN, whoever is
 * at the screen; only an open Owner's PIN counts; and PINs sent all at once
 * are checked one at a time, so the 5-try lock holds. Everything goes through
 * the Server Actions, as the Manager at the counter.
 */
let salon: Salon;
let manager: string;

async function ownerAdded(amount: number): Promise<string> {
  asRequest(manager);
  const saved = await addEntryAction({ kind: "owner_added", amount, description: "Float", pin: OWNER_PIN });
  expect(saved).toMatchObject({ ok: true });
  const [row] = await db
    .select({ id: cashEntries.id })
    .from(cashEntries)
    .where(and(eq(cashEntries.kind, "owner_added"), eq(cashEntries.amount, amount)));
  return row.id;
}

function cancel(entryId: string, reason: string, pin?: string) {
  asRequest(manager);
  return voidEntryAction({ entryId, reason, ...(pin ? { pin } : {}) });
}

const cancellationsOf = (entryId: string) => db.select().from(cashEntries).where(eq(cashEntries.voidsEntryId, entryId));

const wrongPins = () =>
  db.select({ id: auditLog.id }).from(auditLog).where(and(eq(auditLog.action, "pin.wrong"), eq(auditLog.target, "owner")));

beforeAll(async () => {
  salon = await seedSalon({ firstDay: { date: "2026-09-01", openingCash: 10_000 } });
  manager = await signIn(salon.manager);
});

describe("cancelling the Owner's cash", () => {
  it("is refused to the Manager without the PIN, and nothing is cancelled (QA-02)", async () => {
    const entryId = await ownerAdded(5_000);

    expect(await cancel(entryId, "Took it back")).toEqual({ ok: false, error: "Cancelling the Owner's cash needs the Owner's PIN." });
    expect(await cancellationsOf(entryId)).toEqual([]);
  });

  it("is refused with a wrong PIN, and the wrong try is recorded", async () => {
    const entryId = await ownerAdded(5_001);

    expect(await cancel(entryId, "Took it back", "0000")).toEqual({ ok: false, error: "Wrong PIN" });
    expect(await cancellationsOf(entryId)).toEqual([]);
    expect(await wrongPins()).toHaveLength(1);
  });

  it("goes through with the Owner's PIN, and the audit log says whose PIN it was", async () => {
    const entryId = await ownerAdded(5_002);

    expect(await cancel(entryId, "Entered twice", OWNER_PIN)).toEqual({ ok: true, data: null });
    const [cancellation] = await cancellationsOf(entryId);
    expect(cancellation).toMatchObject({ amount: -5_002, pinConfirmed: true, createdBy: "manager" });
    const [audit] = await db.select().from(auditLog).where(eq(auditLog.action, "folder.cancel"));
    expect(audit.after).toMatchObject({ reason: "Entered twice", pinOf: "owner" });
  });

  it("is cancelled once only", async () => {
    const entryId = await ownerAdded(5_003);
    await cancel(entryId, "Entered twice", OWNER_PIN);

    expect(await cancel(entryId, "Again", OWNER_PIN)).toEqual({ ok: false, error: "This entry is already cancelled" });
    expect(await cancellationsOf(entryId)).toHaveLength(1);
  });
});

describe("whose PIN counts (QA-10)", () => {
  it("any open Owner's, and never a closed Owner's", async () => {
    const second = await makeAccount(salon.developer, "owner", "Second Owner", "owner2");
    await resetPin(salon.developer, second.id, "1357");

    const first = await ownerAdded(6_000);
    expect(await cancel(first, "Second owner's PIN", "1357")).toEqual({ ok: true, data: null });
    const cancels = await db.select({ after: auditLog.after }).from(auditLog).where(eq(auditLog.action, "folder.cancel"));
    expect(cancels.some((row) => (row.after as { pinOf?: string }).pinOf === "owner2")).toBe(true);

    await setUserActive(salon.developer, second.id, false);
    const next = await ownerAdded(6_001);
    expect(await cancel(next, "Closed owner's PIN", "1357")).toEqual({ ok: false, error: "Wrong PIN" });
    expect(await cancellationsOf(next)).toEqual([]);
  });
});

describe("the 5-try lock (QA-07)", () => {
  it("holds against twenty wrong PINs sent at once", async () => {
    const entryId = await ownerAdded(7_000);
    const before = (await wrongPins()).length;
    await warmPool();

    const results = await Promise.all(Array.from({ length: 20 }, () => cancel(entryId, "Guessing", "9999")));

    const errors = results.map((result) => (result.ok ? "went through" : result.error));
    expect(errors.filter((error) => error === "Wrong PIN")).toHaveLength(5 - before);
    expect(errors.filter((error) => error.startsWith("Too many wrong PINs"))).toHaveLength(15 + before);
    expect(await wrongPins()).toHaveLength(5);
    expect(await cancellationsOf(entryId)).toEqual([]);

    // Locked now, for the right PIN too.
    expect(await cancel(entryId, "Locked", OWNER_PIN)).toMatchObject({ ok: false, error: expect.stringMatching(/^Too many wrong PINs/) });
  });
});
