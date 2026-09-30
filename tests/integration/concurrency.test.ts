import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  billCancellations,
  bills,
  capitalItems,
  capitalRepayments,
  cashEntries,
  daySnapshots,
  fixedExpenseLines,
  khataEntries,
  monthlyExpenses,
  partnerDrawings,
} from "@/db/schema";
import { cancelBillAction, createBillAction } from "@/features/billing/actions";
import { addInvestmentAction, addRepaymentAction } from "@/features/capital/actions";
import { closeDayAction } from "@/features/day-close/actions";
import { reviewClose } from "@/features/day-close/service";
import { addEntryAction, voidEntryAction } from "@/features/folders/actions";
import { addFixedLineAction, addOtherAction, setFixedAction, voidOtherAction } from "@/features/monthly-expenses/actions";
import { addDrawingAction, voidDrawingAction } from "@/features/partners/actions";
import { giveBonusAction } from "@/features/staff-khata/actions";
import type { ActionResult } from "@/lib/action-result";
import { asRequest } from "./request";
import { seedSalon, signIn, warmPool, type Salon } from "./salon";

/**
 * P7.2 (QA-03, QA-25), and the exactly-once saves before it (P3.15, P2.2e):
 * the same request arriving several times at once — a double press, a retry,
 * two tabs — changes the books once. Each case sends its Server Action calls
 * together, on a warmed pool, and counts the rows that reached the database.
 */
let salon: Salon;
let owner: string;
let manager: string;

beforeAll(async () => {
  salon = await seedSalon({ firstDay: { date: "2026-09-01", openingCash: 50_000 } });
  owner = await signIn(salon.owner);
  manager = await signIn(salon.manager);
});

/** One call, as `cookie`'s browser. */
async function as<T>(cookie: string, call: () => Promise<ActionResult<T>>) {
  asRequest(cookie);
  const result = await call();
  expect(result, JSON.stringify(result)).toMatchObject({ ok: true });
  return result;
}

/** The same call `times` times at once, as `cookie`'s browser. */
async function atOnce<T>(cookie: string, times: number, call: () => Promise<ActionResult<T>>) {
  await warmPool();
  asRequest(cookie);
  const results = await Promise.all(Array.from({ length: times }, call));
  return {
    saved: results.filter((result) => result.ok).map((result) => (result as { ok: true; data: T }).data),
    refused: results.filter((result) => !result.ok).map((result) => (result as { ok: false; error: string }).error),
  };
}

/** Answers that were a save of their own rather than "already saved". */
const firstSaves = (answers: unknown[]) => answers.filter((answer) => !(answer as { alreadySaved?: boolean } | null)?.alreadySaved);

describe("one cancellation per row, however many arrive at once (QA-03)", () => {
  it("a folder expense: five cancels write one reversal", async () => {
    await as(manager, () => addEntryAction({ kind: "expense", amount: 300, description: "Tea", paidFrom: "drawer" }));
    const [entry] = await db.select().from(cashEntries).where(eq(cashEntries.description, "Tea"));

    const { saved, refused } = await atOnce(manager, 5, () => voidEntryAction({ entryId: entry.id, reason: "Entered twice" }));

    expect(saved).toHaveLength(1);
    expect(refused).toEqual(Array(4).fill("This entry is already cancelled"));
    expect(await db.select().from(cashEntries).where(eq(cashEntries.voidsEntryId, entry.id))).toHaveLength(1);
  });

  it("a partner's drawing: five cancels write one reversal", async () => {
    await as(owner, () => addDrawingAction({ partnerId: salon.partners["Partner A"], month: "2026-09", amount: 20_000 }));
    const [drawing] = await db.select().from(partnerDrawings).where(eq(partnerDrawings.amount, 20_000));

    const { saved, refused } = await atOnce(owner, 5, () => voidDrawingAction({ drawingId: drawing.id, reason: "Wrong partner" }));

    expect(saved).toHaveLength(1);
    expect(refused).toEqual(Array(4).fill("This entry is already cancelled"));
    expect(await db.select().from(partnerDrawings).where(eq(partnerDrawings.voidsId, drawing.id))).toHaveLength(1);
  });

  it("a monthly 'other' expense: five cancels write one reversal", async () => {
    await as(owner, () => addOtherAction({ month: "2026-09", reason: "Plumber", amount: 1_500, paidFrom: "drawer" }));
    const [expense] = await db.select().from(monthlyExpenses).where(eq(monthlyExpenses.reason, "Plumber"));

    const { saved, refused } = await atOnce(owner, 5, () => voidOtherAction({ entryId: expense.id, reason: "Never came" }));

    expect(saved).toHaveLength(1);
    expect(refused).toEqual(Array(4).fill("This entry is already cancelled"));
    expect(await db.select().from(monthlyExpenses).where(eq(monthlyExpenses.voidsId, expense.id))).toHaveLength(1);
  });

  it("a bill: five cancels write one cancellation and one reversal bill", async () => {
    await as(manager, () =>
      createBillAction({
        lines: [{ serviceId: salon.services.Haircut, staffId: salon.staff.Arshad, dealId: null, dealInstanceId: null }],
        customer: null,
        cash: 500,
        online: 0,
      }),
    );
    const [bill] = await db.select().from(bills).orderBy(bills.billNo).limit(1);

    const { saved } = await atOnce(manager, 5, () => cancelBillAction({ billId: bill.id, reason: "Customer left" }));

    expect(saved).toHaveLength(1);
    expect(await db.select().from(billCancellations).where(eq(billCancellations.billId, bill.id))).toHaveLength(1);
    expect(await db.select().from(bills).where(eq(bills.reversesBillId, bill.id))).toHaveLength(1);
  });
});

describe("amounts worked out under a lock (QA-25)", () => {
  it("two installments at once cannot repay more than is owed", async () => {
    await as(owner, () =>
      addInvestmentAction({ name: "Chairs", totalCost: 250_000, contributions: [{ partnerId: salon.partners["Partner A"], amount: 250_000 }] }),
    );
    const [item] = await db.select().from(capitalItems).where(eq(capitalItems.name, "Chairs"));

    const { saved, refused } = await atOnce(owner, 2, () =>
      addRepaymentAction({ capitalItemId: item.id, partnerId: salon.partners["Partner A"], amount: 240_000 }),
    );

    expect(saved).toHaveLength(1);
    expect(refused).toEqual(["Only Rs 10,000 is left to repay this partner"]);
    const paid = await db.select().from(capitalRepayments).where(eq(capitalRepayments.capitalItemId, item.id));
    expect(paid.map((row) => row.amount)).toEqual([240_000]);
  });

  it("five saves of one fixed monthly amount at once leave that amount", async () => {
    await as(owner, () => addFixedLineAction({ name: "Rent", paidByOwner: false }));
    const [line] = await db.select().from(fixedExpenseLines).where(eq(fixedExpenseLines.name, "Rent"));

    const { saved } = await atOnce(owner, 5, () => setFixedAction({ month: "2026-09", lineId: line.id, amount: 5_000 }));

    expect(saved).toHaveLength(5);
    const rows = await db
      .select({ amount: monthlyExpenses.amount })
      .from(monthlyExpenses)
      .where(and(eq(monthlyExpenses.kind, "fixed"), eq(monthlyExpenses.label, "Rent")));
    expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBe(5_000);
  });
});

describe("one save per client id, however many arrive at once", () => {
  it("a bill (P3.15)", async () => {
    const clientId = randomUUID();
    const { saved } = await atOnce(manager, 5, () =>
      createBillAction({
        lines: [{ serviceId: salon.services.Shave, staffId: salon.staff.Bilal, dealId: null, dealInstanceId: null }],
        customer: { phone: "03001234567", name: "Kamran" },
        cash: 250,
        online: 0,
        clientId,
      }),
    );

    expect(saved).toHaveLength(5);
    expect(firstSaves(saved)).toHaveLength(1);
    expect(new Set(saved.map((answer) => answer.receipt.billNo)).size).toBe(1);
    expect(await db.select().from(bills).where(eq(bills.clientId, clientId))).toHaveLength(1);
  });

  it("a folder entry (P2.2e)", async () => {
    const clientId = randomUUID();
    const { saved } = await atOnce(manager, 5, () =>
      addEntryAction({ kind: "expense", amount: 120, description: "Soap", paidFrom: "drawer", clientId }),
    );

    expect(firstSaves(saved)).toHaveLength(1);
    expect(await db.select().from(cashEntries).where(eq(cashEntries.clientId, clientId))).toHaveLength(1);
  });

  it("an Owner money form — a bonus, a drawing, an 'other' expense (P7.2)", async () => {
    const bonusId = randomUUID();
    const drawingId = randomUUID();
    const otherId = randomUUID();

    const bonus = await atOnce(owner, 5, () => giveBonusAction({ staffId: salon.staff.Karim, amount: 1_000, reason: "Eid", clientId: bonusId }));
    const drawing = await atOnce(owner, 5, () =>
      addDrawingAction({ partnerId: salon.partners["Partner B"], month: "2026-09", amount: 7_000, clientId: drawingId }),
    );
    const other = await atOnce(owner, 5, () =>
      addOtherAction({ month: "2026-09", reason: "Paint", amount: 900, paidFrom: "owner", clientId: otherId }),
    );

    for (const { saved } of [bonus, drawing, other]) {
      expect(saved).toHaveLength(5);
      expect(firstSaves(saved)).toHaveLength(1);
    }
    expect(await db.select().from(khataEntries).where(eq(khataEntries.kind, "bonus"))).toHaveLength(1);
    expect(await db.select().from(partnerDrawings).where(eq(partnerDrawings.amount, 7_000))).toHaveLength(1);
    expect(await db.select().from(monthlyExpenses).where(eq(monthlyExpenses.reason, "Paint"))).toHaveLength(1);
  });
});

describe("one close per day", () => {
  it("three closes at once close the day once, and post its wages once", async () => {
    const { expected } = await reviewClose({ attendance: {}, payouts: {}, counted: 0 });

    const { saved, refused } = await atOnce(manager, 3, () => closeDayAction({ attendance: {}, payouts: {}, counted: expected }));

    expect(saved).toHaveLength(1);
    expect(refused).toEqual(Array(2).fill("This day has already been closed."));
    expect(await db.select().from(daySnapshots)).toHaveLength(1);
    const wages = await db.select().from(khataEntries).where(and(eq(khataEntries.kind, "earning"), eq(khataEntries.staffId, salon.staff.Bilal)));
    expect(wages).toHaveLength(1);
  });
});
