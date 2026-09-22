import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { writeAudit } from "@/db/audit";
import { customerSpecialRates, customers, services } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { UserError } from "@/lib/errors";
import type { EditCustomerInput, RemoveRateInput, SetRateInput } from "./schemas";

const actorOf = (user: SessionUser) => user.username || user.name;

async function load(customerId: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  if (!customer) throw new UserError("That customer was not found.");
  return customer;
}

/**
 * Change a customer's name or phone number (backlog P3.2).
 *
 * Spec §11 allows exactly this much editing and asks for a record of it, so the
 * audit entry carries both the old and the new values. Nothing else about a
 * customer can be changed, and a customer is never deleted: bills point at them.
 */
export async function editCustomer(current: SessionUser, input: EditCustomerInput): Promise<void> {
  const customer = await load(input.id);

  // The phone number is the key the counter looks a customer up by, and the
  // column is unique. Checked here so the screen can say which number it is,
  // rather than showing a constraint violation.
  const [clash] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.phone, input.phone), ne(customers.id, customer.id)))
    .limit(1);
  if (clash) throw new UserError(`${input.phone} already belongs to another customer.`);

  if (customer.name === input.name && customer.phone === input.phone) return;

  await db.transaction(async (tx) => {
    await tx.update(customers).set({ name: input.name, phone: input.phone }).where(eq(customers.id, customer.id));
    await writeAudit(tx, {
      actor: actorOf(current),
      action: "customer.edit",
      target: customer.phone,
      before: { name: customer.name, phone: customer.phone },
      after: { name: input.name, phone: input.phone },
    });
  });
}

/**
 * Fix a price for one customer and one service — the "special rate" billing has
 * always read but nothing could set (spec §5.1, §10.4: rates are the Owner's,
 * never the counter's discretion).
 *
 * It is an upsert: the pair is the primary key, so setting a rate that already
 * exists corrects it rather than failing.
 */
export async function setSpecialRate(current: SessionUser, input: SetRateInput): Promise<void> {
  const customer = await load(input.customerId);
  const [service] = await db.select().from(services).where(eq(services.id, input.serviceId)).limit(1);
  if (!service || !service.active) throw new UserError("That service is not available.");

  const [existing] = await db
    .select({ price: customerSpecialRates.price })
    .from(customerSpecialRates)
    .where(and(eq(customerSpecialRates.customerId, customer.id), eq(customerSpecialRates.serviceId, service.id)))
    .limit(1);

  await db.transaction(async (tx) => {
    await tx
      .insert(customerSpecialRates)
      .values({ customerId: customer.id, serviceId: service.id, price: input.price })
      .onConflictDoUpdate({
        target: [customerSpecialRates.customerId, customerSpecialRates.serviceId],
        set: { price: input.price },
      });
    await writeAudit(tx, {
      actor: actorOf(current),
      action: "customer.rate-set",
      target: `${customer.name} / ${service.name}`,
      before: existing ? { price: existing.price } : undefined,
      after: { price: input.price, listPrice: service.price },
    });
  });
}

/** Put a customer back on the list price. */
export async function removeSpecialRate(current: SessionUser, input: RemoveRateInput): Promise<void> {
  const customer = await load(input.customerId);
  const [service] = await db.select().from(services).where(eq(services.id, input.serviceId)).limit(1);
  if (!service) throw new UserError("That service was not found.");

  const [existing] = await db
    .select({ price: customerSpecialRates.price })
    .from(customerSpecialRates)
    .where(and(eq(customerSpecialRates.customerId, customer.id), eq(customerSpecialRates.serviceId, service.id)))
    .limit(1);
  if (!existing) throw new UserError("There is no special rate to remove.");

  await db.transaction(async (tx) => {
    await tx
      .delete(customerSpecialRates)
      .where(and(eq(customerSpecialRates.customerId, customer.id), eq(customerSpecialRates.serviceId, service.id)));
    await writeAudit(tx, {
      actor: actorOf(current),
      action: "customer.rate-remove",
      target: `${customer.name} / ${service.name}`,
      before: { price: existing.price },
      after: { price: service.price, listPrice: true },
    });
  });
}
