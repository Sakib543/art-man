import { eq } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { dealItems, deals, services, staff } from "@/db/schema";
import { normalizeStaffPay } from "@/lib/accounting";
import type { SessionUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import type { DealInput, ServiceInput, StaffInput } from "./schemas";

const actorOf = (user: SessionUser) => user.username || user.name;

/** Add or edit a staff member. Edits apply from now on; past records never change. */
export async function saveStaff(user: SessionUser, input: StaffInput): Promise<void> {
  const pay = normalizeStaffPay({
    payType: input.payType,
    salary: input.salary,
    dailyWage: input.dailyWage,
    commissionRate: input.commissionRate,
  });
  const values = { name: input.name, ...pay, active: input.active };

  if (!input.id) {
    await db.transaction(async (tx) => {
      await tx.insert(staff).values(values);
      await writeAudit(tx, { actor: actorOf(user), action: "staff.create", target: input.name, after: values });
    });
    return;
  }

  const id = input.id;
  const [before] = await db
    .select({
      name: staff.name,
      payType: staff.payType,
      salary: staff.salary,
      dailyWage: staff.dailyWage,
      commissionRate: staff.commissionRate,
      active: staff.active,
    })
    .from(staff)
    .where(eq(staff.id, id))
    .limit(1);
  if (!before) throw new UserError("Staff member not found");

  await db.transaction(async (tx) => {
    await tx.update(staff).set(values).where(eq(staff.id, id));

    await writeAudit(tx, {
      actor: actorOf(user),
      action: "staff.update",
      target: before.name,
      before,
      after: values,
    });
  });
}

export async function saveService(user: SessionUser, input: ServiceInput): Promise<void> {
  const values = {
    name: input.name,
    category: input.category,
    price: input.price,
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
