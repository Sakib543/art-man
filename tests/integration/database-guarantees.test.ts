import { sql } from "drizzle-orm";
import type { PoolClient } from "pg";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { cancelBill } from "@/db/bill-cancel";
import { checkDayCodes } from "@/db/day-code";
import { bills } from "@/db/schema";
import { addInvestment, addRepayment } from "@/features/capital/service";
import { reopenDay, startNextDay } from "@/features/day-close/service";
import { entrySchema } from "@/features/folders/schemas";
import { addEntry } from "@/features/folders/service";
import { recordAdjustment } from "@/features/month-adjustments/service";
import { closeMonth } from "@/features/month-close/service";
import { addOther } from "@/features/monthly-expenses/service";
import { addDrawing } from "@/features/partners/service";
import { closeToday, ringUp, seedSalon, type Salon } from "./salon";

/**
 * What the database itself guarantees, whatever the app does: the 15
 * append-only triggers, the developer's hatch through them and its limits,
 * and the security code catching a changed record. A row in every financial
 * table is made through the services first, so each trigger has something to
 * refuse.
 */
let salon: Salon;

/** Every append-only trigger, by table, and the function it runs. */
const TRIGGERS: Record<string, string> = {
  audit_log: "forbid_change_always",
  bill_cancellations: "forbid_change",
  bill_lines: "forbid_change",
  bills: "forbid_change",
  capital_contributions: "forbid_change",
  capital_items: "forbid_change",
  capital_repayments: "forbid_change",
  cash_entries: "forbid_change",
  day_snapshot_history: "forbid_change_always",
  day_snapshots: "forbid_update",
  khata_entries: "forbid_change",
  month_adjustments: "forbid_change",
  month_closes: "forbid_change",
  monthly_expenses: "forbid_change",
  partner_drawings: "forbid_change",
};
const TABLES = Object.keys(TRIGGERS);
const HATCHED = TABLES.filter((table) => TRIGGERS[table] === "forbid_change");

beforeAll(async () => {
  salon = await seedSalon({ firstDay: { date: "2026-09-29", openingCash: 5_000 } });
  const { owner, manager } = salon;
  const partner = salon.partners["Partner A"];

  await ringUp(manager, [{ serviceId: salon.services.Haircut, staffId: salon.staff.Arshad }], { cash: 500 });
  await ringUp(manager, [
    { serviceId: salon.services.Facial, staffId: salon.staff.Arshad },
    { serviceId: salon.services.Shave, staffId: salon.staff.Bilal },
  ], { cash: 1_500 });
  const [first] = await db.select().from(bills).orderBy(bills.billNo).limit(1);
  await cancelBill(manager, first.id, "Customer left");
  await addEntry(manager, entrySchema.parse({ kind: "staff_advance", amount: 300, staffId: salon.staff.Bilal }));
  await addOther(owner, { month: "2026-09", reason: "Plumber", amount: 800, paidFrom: "drawer", clientId: null });
  await addDrawing(owner, { partnerId: partner, month: "2026-09", amount: 1_000, clientId: null });
  await addInvestment(owner, { name: "Mirror", totalCost: 10_000, contributions: [{ partnerId: partner, amount: 10_000 }], clientId: null });
  const [{ id: itemId }] = (await db.execute<{ id: string }>(sql`select id from capital_items limit 1`)).rows;
  await addRepayment(owner, { capitalItemId: itemId, partnerId: partner, amount: 2_000, clientId: null });
  await closeToday(manager);
  await reopenDay(owner, "Recount");
  await closeToday(manager);
  await startNextDay(manager);
  await ringUp(manager, [{ serviceId: salon.services.Haircut, staffId: salon.staff.Karim }], { cash: 500 });
  await closeToday(manager);
  await closeMonth(owner, "2026-09");
  await startNextDay(manager);
  await recordAdjustment(owner, {
    correctsMonth: "2026-09",
    kind: "expense",
    direction: "more",
    amount: 100,
    online: false,
    paidFrom: "drawer",
    reason: "A receipt found late",
    clientId: null,
  });
});

/**
 * Run `work` on one connection inside a transaction that is always rolled
 * back, so a trigger that failed to refuse cannot leave the table changed.
 */
async function inRolledBack<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db.$client.connect();
  try {
    await client.query("begin");
    return await work(client);
  } finally {
    await client.query("rollback");
    client.release();
  }
}

/** The SQLSTATE a statement fails with, or "ok"; each attempt is undone with a savepoint. */
async function attempt(client: PoolClient, statement: string): Promise<string> {
  await client.query("savepoint attempt");
  try {
    await client.query(statement);
    return "ok";
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  } finally {
    await client.query("rollback to savepoint attempt");
  }
}

/** A column to set to itself, so an UPDATE changes nothing but still fires the trigger. */
async function anyColumn(table: string): Promise<string> {
  const { rows } = await db.execute<{ column: string }>(
    sql`select column_name as column from information_schema.columns where table_name = ${table} order by ordinal_position limit 1`,
  );
  return rows[0].column;
}

const REFUSED = "23001"; // restrict_violation, which every trigger raises

describe("the append-only triggers", () => {
  it("are all there, each on its table with the function it should run", async () => {
    const { rows } = await db.execute<{ table: string; fn: string }>(sql`
      select c.relname as table, p.proname as fn
      from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_proc p on p.oid = t.tgfoid
      where not t.tgisinternal and c.relnamespace = 'public'::regnamespace`);
    expect(Object.fromEntries(rows.map((row) => [row.table, row.fn]))).toEqual(TRIGGERS);
  });

  it("every financial table has rows to protect", async () => {
    for (const table of TABLES) {
      const { rows } = await db.execute<{ n: number }>(sql.raw(`select count(*)::int as n from ${table}`));
      expect(rows[0].n, table).toBeGreaterThan(0);
    }
  });

  it.each(TABLES)("%s refuses UPDATE", async (table) => {
    const column = await anyColumn(table);
    expect(await inRolledBack((client) => attempt(client, `update ${table} set ${column} = ${column}`))).toBe(REFUSED);
  });

  it.each(TABLES.filter((table) => table !== "day_snapshots"))("%s refuses DELETE", async (table) => {
    expect(await inRolledBack((client) => attempt(client, `delete from ${table}`))).toBe(REFUSED);
  });

  it("day_snapshots may be deleted — a reopen replaces the record, the old one kept in day_snapshot_history (0009)", async () => {
    expect(await inRolledBack((client) => attempt(client, "delete from day_snapshots"))).toBe("ok");
  });

  it("still take new rows", async () => {
    expect(await inRolledBack((client) => attempt(client, "insert into audit_log (actor, action) values ('test', 'test.insert')"))).toBe("ok");
  });
});

describe("the developer's hatch (0012)", () => {
  it("opens the financial tables inside the one transaction that asks", async () => {
    const outcomes = await inRolledBack(async (client) => {
      await client.query("select set_config('app.allow_financial_edit', 'on', true)");
      const found: Record<string, string> = {};
      for (const table of HATCHED) {
        const column = await anyColumn(table);
        found[table] = await attempt(client, `update ${table} set ${column} = ${column}`);
      }
      return found;
    });
    expect(outcomes).toEqual(Object.fromEntries(HATCHED.map((table) => [table, "ok"])));
  });

  it("never opens the record of what happened, nor updates a closing record", async () => {
    const outcomes = await inRolledBack(async (client) => {
      await client.query("select set_config('app.allow_financial_edit', 'on', true)");
      return {
        audit: await attempt(client, "delete from audit_log"),
        history: await attempt(client, "delete from day_snapshot_history"),
        snapshot: await attempt(client, "update day_snapshots set sale = sale"),
      };
    });
    expect(outcomes).toEqual({ audit: REFUSED, history: REFUSED, snapshot: REFUSED });
  });

  it("closes again when the transaction ends, on the same connection", async () => {
    const client = await db.$client.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('app.allow_financial_edit', 'on', true)");
      await client.query("commit");
      await client.query("begin");
      expect(await attempt(client, "update bills set id = id")).toBe(REFUSED);
      await client.query("rollback");
    } finally {
      client.release();
    }
  });

  // Known gaps, backlog P7.14 (QA-23, QA-24). Each is written as the guarantee
  // it should be and marked `fails`: when P7.14 closes one, its test starts to
  // fail here, and the `.fails` comes off.
  it.fails("is not opened by a session-level SET from any connection (P7.14)", async () => {
    const client = await db.$client.connect();
    try {
      await client.query("set app.allow_financial_edit = 'on'");
      await client.query("begin");
      const outcome = await attempt(client, "update bills set id = id");
      await client.query("rollback");
      expect(outcome).toBe(REFUSED);
    } finally {
      await client.query("reset app.allow_financial_edit");
      client.release();
    }
  });

  it.fails("TRUNCATE is refused on the financial tables (P7.14)", async () => {
    expect(await inRolledBack((client) => attempt(client, "truncate audit_log"))).toBe(REFUSED);
  });
});

describe("the security code", () => {
  // Its own scenarios are in security-code.test.ts; here, after a reopen, a
  // closed-day cancellation and a month close.
  it("checks out on every closed day the app changed the proper way", async () => {
    expect((await checkDayCodes("2026-09-29", "2026-09-30")).map((day) => day.ok)).toEqual([true, true]);
  });
});
