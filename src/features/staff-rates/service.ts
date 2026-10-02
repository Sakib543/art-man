import { and, between, count, desc, eq, isNotNull, like } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { attendance, businessDays, dealItems, deals, khataEntries, monthCloses, services, staff } from "@/db/schema";
import {
  isLeaverSalaryLabel,
  leaverSalaryLabel,
  leaverSalaryTakenBackLabel,
  normalizeStaffPay,
  paysSalary,
  type PayType,
} from "@/lib/accounting";
import type { SessionUser } from "@/lib/auth/session";
import { formatMonth, monthOf, monthStart } from "@/lib/business-date";
import { UserError } from "@/lib/errors";
import { formatDayMonth } from "@/lib/format";
import { settleLeaver, type LeaverSettlement } from "./leaver";
import type { DealInput, LeaverPreviewInput, ServiceInput, StaffInput } from "./schemas";

const actorOf = (user: SessionUser) => user.username || user.name;

/** Anything that can run selects: the db itself or a transaction. */
type Reader = Pick<typeof db, "select">;

/**
 * What making this karigar inactive with `lastDay` as their last working day
 * settles (backlog P3.19): read on `reader` — the save's own transaction, so
 * nothing waits on the pool while the staff row is locked (trap 8.38).
 */
async function leaverSettlement(
  reader: Reader,
  member: { id: string; payType: number; salary: number },
  lastDay: string,
): Promise<LeaverSettlement> {
  const month = monthOf(lastDay);
  const [[latestClosed], dayRows, closedRows, [present]] = [
    await reader
      .select({ date: businessDays.businessDate })
      .from(businessDays)
      .where(isNotNull(businessDays.closedAt))
      .orderBy(desc(businessDays.businessDate))
      .limit(1),
    await reader.select({ date: businessDays.businessDate }).from(businessDays),
    await reader.select({ month: monthCloses.month }).from(monthCloses),
    await reader
      .select({ days: count() })
      .from(attendance)
      .where(
        and(
          eq(attendance.staffId, member.id),
          eq(attendance.present, true),
          between(attendance.businessDate, monthStart(month), lastDay),
        ),
      ),
  ];
  const closed = new Set(closedRows.map((row) => monthOf(row.month)));
  const openMonths = [...new Set(dayRows.map((row) => monthOf(row.date)))].filter((m) => !closed.has(m)).sort();

  return settleLeaver({
    salaried: paysSalary(member.payType as PayType),
    salary: member.salary,
    lastDay,
    latestClosedDay: latestClosed?.date ?? null,
    lastDayMonthClosed: closed.has(month),
    earliestOpenMonth: openMonths[0] ?? null,
    daysPresent: present?.days ?? 0,
  });
}

/** What the Staff & rates form shows before making a karigar inactive (P3.19): the same sum the Save will post. */
export async function previewLeaver(input: LeaverPreviewInput): Promise<{ settlement: LeaverSettlement; salary: number }> {
  const [member] = await db.select().from(staff).where(eq(staff.id, input.staffId)).limit(1);
  if (!member) throw new UserError("Staff member not found");
  return { settlement: await leaverSettlement(db, member, input.lastDay), salary: member.salary };
}

/**
 * Add or edit a staff member. Edits apply from now on; past records never change.
 *
 * Making a karigar on a salary inactive (P3.19) posts the month's salary for
 * the days they were present up to their last working day, in the same
 * transaction; making them active again while that month is open takes it
 * back, since Month close will pay them the month in full. The staff row is
 * locked first, so two Saves at once settle once.
 */
export async function saveStaff(user: SessionUser, input: StaffInput): Promise<void> {
  const pay = normalizeStaffPay({
    payType: input.payType,
    salary: input.salary,
    dailyWage: input.dailyWage,
    commissionRate: input.commissionRate,
  });
  const values = { name: input.name, ...pay, active: input.active };

  if (!input.id) {
    const created = { ...values, overtimeRate: input.overtimeRate ?? 0 };
    await db.transaction(async (tx) => {
      await tx.insert(staff).values(created);
      await writeAudit(tx, { actor: actorOf(user), action: "staff.create", target: input.name, after: created });
    });
    return;
  }

  const id = input.id;
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({
        name: staff.name,
        payType: staff.payType,
        salary: staff.salary,
        dailyWage: staff.dailyWage,
        commissionRate: staff.commissionRate,
        overtimeRate: staff.overtimeRate,
        active: staff.active,
      })
      .from(staff)
      .where(eq(staff.id, id))
      .limit(1)
      .for("update");
    if (!before) throw new UserError("Staff member not found");

    // Settled on the pay they left on, before this Save changes it.
    const leaving = before.active && !input.active && paysSalary(before.payType as PayType);
    let settlement: LeaverSettlement | null = null;
    if (leaving) {
      if (!input.lastDay) throw new UserError("Choose their last working day.");
      settlement = await leaverSettlement(tx, { id, payType: before.payType, salary: before.salary }, input.lastDay);
      if (settlement.kind === "refuse") throw new UserError(settlement.problem);
    }

    const updated = { ...values, overtimeRate: input.overtimeRate ?? before.overtimeRate };
    await tx.update(staff).set(updated).where(eq(staff.id, id));

    if (settlement?.kind === "pay" && settlement.amount > 0) {
      await tx.insert(khataEntries).values({
        staffId: id,
        businessDate: input.lastDay!,
        kind: "earning",
        label: leaverSalaryLabel(formatMonth(settlement.month), settlement.daysPresent, settlement.daysInMonth, formatDayMonth(input.lastDay!)),
        amount: settlement.amount,
      });
    }
    const takenBack = !before.active && input.active ? await takeBackLeaverSalary(tx, id) : [];

    await writeAudit(tx, {
      actor: actorOf(user),
      action: "staff.update",
      target: before.name,
      before,
      after: {
        ...updated,
        ...(settlement ? { lastDay: input.lastDay, leaverSalary: settlement } : {}),
        ...(takenBack.length > 0 ? { leaverSalaryTakenBack: takenBack } : {}),
      },
    });
  });
}

/**
 * A karigar made active again (P3.19): the salary posted when they were made
 * inactive is taken back while its month is open — Month close pays the
 * active staff the month in full, and the two together would pay it twice.
 * In a closed month it stays: that month was paid as it was.
 */
async function takeBackLeaverSalary(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], staffId: string): Promise<number[]> {
  const lines = await tx
    .select()
    .from(khataEntries)
    .where(and(eq(khataEntries.staffId, staffId), eq(khataEntries.kind, "earning"), like(khataEntries.label, "Monthly salary (%")));
  const reversed = new Set(lines.flatMap((line) => (line.reversesEntryId ? [line.reversesEntryId] : [])));
  const closedRows = await tx.select({ month: monthCloses.month }).from(monthCloses);
  const closed = new Set(closedRows.map((row) => monthOf(row.month)));

  const amounts: number[] = [];
  for (const line of lines) {
    if (!isLeaverSalaryLabel(line.label) || line.reversesEntryId || reversed.has(line.id)) continue;
    if (closed.has(monthOf(line.businessDate))) continue;
    await tx.insert(khataEntries).values({
      staffId,
      businessDate: line.businessDate,
      kind: "earning",
      label: leaverSalaryTakenBackLabel(formatMonth(monthOf(line.businessDate))),
      amount: -line.amount,
      reversesEntryId: line.id,
    });
    amounts.push(line.amount);
  }
  return amounts;
}

export async function saveService(user: SessionUser, input: ServiceInput): Promise<void> {
  const values = {
    name: input.name,
    category: input.category,
    price: input.price,
    maxPrice: input.maxPrice,
    minutes: input.minutes,
    active: input.active,
  };

  if (!input.id) {
    await db.transaction(async (tx) => {
      await tx.insert(services).values(values);
      await writeAudit(tx, { actor: actorOf(user), action: "service.create", target: input.name, after: values });
    });
    return;
  }

  const id = input.id;
  const [before] = await db.select().from(services).where(eq(services.id, id)).limit(1);
  if (!before) throw new UserError("Service not found");

  await db.transaction(async (tx) => {
    await tx.update(services).set(values).where(eq(services.id, id));
    await writeAudit(tx, {
      actor: actorOf(user),
      action: "service.update",
      target: before.name,
      before,
      after: values,
    });
  });
}

export async function saveDeal(user: SessionUser, input: DealInput): Promise<void> {
  const serviceIds = [...new Set(input.serviceIds)];
  if (serviceIds.length < 2) throw new UserError("A deal needs at least two different services");

  const found = await db.select({ id: services.id }).from(services);
  const known = new Set(found.map((row) => row.id));
  if (serviceIds.some((id) => !known.has(id))) throw new UserError("One of the chosen services does not exist");

  const values = { name: input.name, price: input.price, active: input.active };

  await db.transaction(async (tx) => {
    let dealId = input.id;
    let before: unknown;

    if (dealId) {
      const [existing] = await tx.select().from(deals).where(eq(deals.id, dealId)).limit(1);
      if (!existing) throw new UserError("Deal not found");
      before = existing;
      await tx.update(deals).set(values).where(eq(deals.id, dealId));
      await tx.delete(dealItems).where(eq(dealItems.dealId, dealId));
    } else {
      const [created] = await tx.insert(deals).values(values).returning({ id: deals.id });
      dealId = created.id;
    }

    await tx.insert(dealItems).values(serviceIds.map((serviceId) => ({ dealId: dealId!, serviceId })));
    await writeAudit(tx, {
      actor: actorOf(user),
      action: input.id ? "deal.update" : "deal.create",
      target: input.name,
      before,
      after: { ...values, serviceIds },
    });
  });
}
