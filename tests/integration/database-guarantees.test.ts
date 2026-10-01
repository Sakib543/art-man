import { sql } from "drizzle-orm";
import type { Client, PoolClient } from "pg";
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
import { asOwner } from "./owner";
import { closeToday, ringUp, seedSalon, type Salon } from "./salon";

/**
 * What the database itself guarantees, whatever the app does: the 15
 * append-only triggers and, since P7.14 (migration 0023), the guards on the
 * two day tables, TRUNCATE refused on all 17, the developer's hatch through
 * them and its limits, the app's own role that owns none of them, and the
 * security code catching a changed record. A row in every financial table is
 * made through the services first, so each trigger has something to refuse.
 *
 * The triggers are tried as the tables' owner — they hold even for the owner,
 * who could still switch them off, which the app's role cannot.
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

/** The two day tables, guarded since P7.14: a day only closes and reopens; a closed day's staff list stays. */
const DAY_GUARDS: Record<string, string> = { attendance: "guard_attendance", business_days: "guard_business_day" };

/** TRUNCATE is refused on every one of them (P7.14, QA-23). */
const TRUNCATE_REFUSED = [...TABLES, ...Object.keys(DAY_GUARDS)].sort();

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
 * Run `work` as the tables' owner, inside a transaction that is always rolled
 * back, so a trigger that failed to refuse cannot leave the table changed.
 */
async function inRolledBack<T>(work: (client: Client) => Promise<T>): Promise<T> {
  return asOwner(async (client) => {
    await client.query("begin");
    try {
      return await work(client);
    } finally {
      await client.query("rollback");
    }
  });
}

/** The same, connected as the app is: its login, which owns no table. */
async function asTheApp<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
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
async function attempt(client: Client | PoolClient, statement: string): Promise<string> {
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
const NOT_PERMITTED = "42501"; // insufficient_privilege: the role may not do it at all

/** The open business day, the one closed before it, and a staff member with an attendance row on that one. */
async function days() {
  const { rows } = await db.execute<{ open: string; closed: string; staff: string }>(sql`
    select (select business_date::text from business_days where closed_at is null) as open,
      (select max(business_date)::text from business_days where closed_at is not null) as closed,
      (select staff_id::text from attendance a
        where a.business_date = (select max(business_date) from business_days where closed_at is not null) limit 1) as staff`);
  return rows[0];
}

describe("the append-only triggers", () => {
  it("are all there, each on its table with the function it should run", async () => {
    const { rows } = await db.execute<{ table: string; fn: string }>(sql`
      select c.relname as table, p.proname as fn
      from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_proc p on p.oid = t.tgfoid
      where not t.tgisinternal and c.relnamespace = 'public'::regnamespace and p.proname <> 'forbid_truncate'`);
    expect(Object.fromEntries(rows.map((row) => [row.table, row.fn]))).toEqual({ ...TRIGGERS, ...DAY_GUARDS });
  });

  it("every financial table has rows to protect", async () => {
    for (const table of TRUNCATE_REFUSED) {
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

describe("TRUNCATE (P7.14, QA-23)", () => {
  it("is refused by a statement trigger on all 17 tables", async () => {
    const { rows } = await db.execute<{ table: string }>(sql`
      select c.relname as table
      from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_proc p on p.oid = t.tgfoid
      where c.relnamespace = 'public'::regnamespace and p.proname = 'forbid_truncate' and t.tgtype & 32 <> 0
      order by 1`);
    expect(rows.map((row) => row.table)).toEqual(TRUNCATE_REFUSED);
  });

  it("does not empty the audit log, even for the tables' owner", async () => {
    expect(await inRolledBack((client) => attempt(client, "truncate audit_log"))).toBe(REFUSED);
  });

  it.each(TRUNCATE_REFUSED)("does not empty %s, with everything that points at it", async (table) => {
    expect(await inRolledBack((client) => attempt(client, `truncate ${table} cascade`))).toBe(REFUSED);
  });

  it("is refused when it would reach a financial table from another — emptying the staff or the customers", async () => {
    expect(await inRolledBack((client) => attempt(client, "truncate staff cascade"))).toBe(REFUSED);
    expect(await inRolledBack((client) => attempt(client, "truncate customers cascade"))).toBe(REFUSED);
  });
});

describe("a business day (P7.14, QA-12)", () => {
  it("keeps its opening cash, its date and when it was opened", async () => {
    const { closed } = await days();
    const outcomes = await inRolledBack(async (client) => ({
      openingCash: await attempt(client, `update business_days set opening_cash = opening_cash + 1000 where business_date = '${closed}'`),
      date: await attempt(client, `update business_days set business_date = business_date - 1 where business_date = '${closed}'`),
      openedAt: await attempt(client, `update business_days set created_at = now() where business_date = '${closed}'`),
    }));
    expect(outcomes).toEqual({ openingCash: REFUSED, date: REFUSED, openedAt: REFUSED });
  });

  it("is never deleted", async () => {
    expect(await inRolledBack((client) => attempt(client, "delete from business_days"))).toBe(REFUSED);
  });

  it("is closed and reopened, and a closed day's closing time is not moved", async () => {
    const { open, closed } = await days();
    const outcomes = await inRolledBack(async (client) => ({
      moved: await attempt(client, `update business_days set closed_at = closed_at - interval '1 day' where business_date = '${closed}'`),
      close: await attempt(client, `update business_days set closed_at = now() where business_date = '${open}'`),
      reopen: await attempt(client, `update business_days set closed_at = null where business_date = '${closed}'`),
    }));
    expect(outcomes).toEqual({ moved: REFUSED, close: "ok", reopen: "ok" });
  });
});

describe("a day's staff list (P7.14, QA-12)", () => {
  it("is never edited — who was present, or the pay a day was settled on", async () => {
    const { closed, staff } = await days();
    const where = `business_date = '${closed}' and staff_id = '${staff}'`;
    const outcomes = await inRolledBack(async (client) => ({
      present: await attempt(client, `update attendance set present = not present where ${where}`),
      pay: await attempt(client, `update attendance set daily_wage = 9999 where ${where}`),
    }));
    expect(outcomes).toEqual({ present: REFUSED, pay: REFUSED });
  });

  it("is removed only once its day is reopened, as reopenDay does in one transaction", async () => {
    const { closed } = await days();
    const outcomes = await inRolledBack(async (client) => ({
      whileClosed: await attempt(client, `delete from attendance where business_date = '${closed}'`),
      afterReopen: await (async () => {
        await client.query(`update business_days set closed_at = null where business_date = '${closed}'`);
        return attempt(client, `delete from attendance where business_date = '${closed}'`);
      })(),
    }));
    expect(outcomes).toEqual({ whileClosed: REFUSED, afterReopen: "ok" });
  });
});

describe("the developer's hatch (0012, P7.14)", () => {
  const OPEN = "select set_config('app.allow_financial_edit', pg_current_xact_id()::text, true)";

  it("opens the financial tables inside the one transaction that asks, by its id", async () => {
    const outcomes = await inRolledBack(async (client) => {
      await client.query(OPEN);
      const found: Record<string, string> = {};
      for (const table of HATCHED) {
        const column = await anyColumn(table);
        found[table] = await attempt(client, `update ${table} set ${column} = ${column}`);
      }
      return found;
    });
    expect(outcomes).toEqual(Object.fromEntries(HATCHED.map((table) => [table, "ok"])));
  });

  it("never opens the record of what happened, a closing record, or the day tables", async () => {
    const { closed } = await days();
    const outcomes = await inRolledBack(async (client) => {
      await client.query(OPEN);
      return {
        audit: await attempt(client, "delete from audit_log"),
        history: await attempt(client, "delete from day_snapshot_history"),
        snapshot: await attempt(client, "update day_snapshots set sale = sale"),
        openingCash: await attempt(client, `update business_days set opening_cash = 1 where business_date = '${closed}'`),
        staffList: await attempt(client, `update attendance set present = present where business_date = '${closed}'`),
        truncate: await attempt(client, "truncate bills cascade"),
      };
    });
    expect(outcomes).toEqual({ audit: REFUSED, history: REFUSED, snapshot: REFUSED, openingCash: REFUSED, staffList: REFUSED, truncate: REFUSED });
  });

  it("does not open on the word 'on' it used to take (QA-24)", async () => {
    expect(
      await inRolledBack(async (client) => {
        await client.query("select set_config('app.allow_financial_edit', 'on', true)");
        return attempt(client, "update bills set id = id");
      }),
    ).toBe(REFUSED);
  });

  it("closes again when the transaction ends, on the same connection", async () => {
    await asOwner(async (client) => {
      await client.query("begin");
      await client.query(OPEN);
      await client.query("commit");
      await client.query("begin");
      expect(await attempt(client, "update bills set id = id")).toBe(REFUSED);
      await client.query("rollback");
    });
  });

  it("is not opened by a session-level SET from any connection — 'on', or an earlier transaction's id (QA-24)", async () => {
    const outcomes = await asOwner(async (client) => {
      const tried: string[] = [];
      await client.query("set app.allow_financial_edit = 'on'");
      await client.query("begin");
      tried.push(await attempt(client, "update bills set id = id"));
      await client.query("rollback");

      // A value left behind on a pooled connection names a transaction that has ended.
      const { rows } = await client.query<{ id: string }>("select pg_current_xact_id()::text as id");
      await client.query(`set app.allow_financial_edit = '${rows[0].id}'`);
      await client.query("begin");
      tried.push(await attempt(client, "update bills set id = id"));
      await client.query("rollback");
      return tried;
    });
    expect(outcomes).toEqual([REFUSED, REFUSED]);
  });
});

describe("the app's role (P7.14, QA-23, QA-24)", () => {
  it("is what the app connects as, and owns no table", async () => {
    const { rows } = await db.execute<{ me: string; owns: number; member: boolean }>(sql`
      select current_user as me,
        (select count(*)::int from pg_tables where schemaname = 'public' and tableowner = current_user) as owns,
        pg_has_role(current_user, 'art_man_app', 'member') as member`);
    expect(rows[0]).toEqual({ me: "art_man_it_web", owns: 0, member: true });
  });

  it("cannot empty a table, switch a trigger off, drop a table or make one", async () => {
    const outcomes = await asTheApp(async (client) => ({
      truncate: await attempt(client, "truncate audit_log"),
      disable: await attempt(client, "alter table bills disable trigger bills_append_only"),
      drop: await attempt(client, "drop table cash_entries"),
      create: await attempt(client, "create table scratch (id int)"),
    }));
    expect(outcomes).toEqual({ truncate: NOT_PERMITTED, disable: NOT_PERMITTED, drop: NOT_PERMITTED, create: NOT_PERMITTED });
  });

  it("may not change or remove a row of the record of what happened at all, whatever a trigger says", async () => {
    const outcomes = await asTheApp(async (client) => ({
      update: await attempt(client, "update audit_log set actor = actor"),
      delete: await attempt(client, "delete from day_snapshot_history"),
      insert: await attempt(client, "insert into audit_log (actor, action) values ('test', 'test.insert')"),
    }));
    expect(outcomes).toEqual({ update: NOT_PERMITTED, delete: NOT_PERMITTED, insert: "ok" });
  });
});

describe("the security code", () => {
  // Its own scenarios are in security-code.test.ts; here, after a reopen, a
  // closed-day cancellation and a month close.
  it("checks out on every closed day the app changed the proper way", async () => {
    expect((await checkDayCodes("2026-09-29", "2026-09-30")).map((day) => day.ok)).toEqual([true, true]);
  });
});
