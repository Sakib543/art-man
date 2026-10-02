import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { businessDays, partners, services, staff, user } from "@/db/schema";
import { createBillSchema } from "@/features/billing/schemas";
import { createBill } from "@/features/billing/service";
import { closeDay, openFirstDay, reviewClose, startNextDay } from "@/features/day-close/service";
import { resetPin } from "@/features/developer/service";
import { addPartner, saveShares } from "@/features/partners/service";
import { saveService, saveStaff } from "@/features/staff-rates/service";
import { createUser } from "@/features/users/service";
import type { PayType } from "@/lib/accounting";
import { auth } from "@/lib/auth/server";
import type { SessionUser } from "@/lib/auth/session";
import { DATABASE_PREFIX } from "./database-names";
import { asRequest } from "./request";

/**
 * A salon to test against, built the way a real one is (backlog P1.9): the
 * developer account as `pnpm db:seed:developer` makes it, and everything else
 * through the services the screens call — the Owner and the Manager on the
 * Users screen, the Owner's PIN, staff, services, partners and shares, and the
 * first business day.
 */

export interface Account extends SessionUser {
  password: string;
}

export interface Salon {
  developer: Account;
  owner: Account;
  manager: Account;
  /** Staff ids by name. */
  staff: Record<string, string>;
  /** Service ids by name. */
  services: Record<string, string>;
  /** Partner ids by name. */
  partners: Record<string, string>;
}

export const OWNER_PIN = "2468";

export interface StaffSpec {
  name: string;
  /** Which parts the pay has (`PAY_PARTS`): 1 salary · 2 salary + commission · 3 daily wage + commission · 4–7 since P3.17. */
  payType: PayType;
  salary?: number;
  dailyWage?: number;
  commissionRate?: number;
}

export interface ServiceSpec {
  name: string;
  price: number;
  maxPrice?: number;
}

export interface SalonSpec {
  staff?: StaffSpec[];
  services?: ServiceSpec[];
  partners?: { name: string; sharePct: number }[];
  /** The first business day and its opening cash; none is opened when left out. */
  firstDay?: { date: string; openingCash: number };
}

const DEFAULT_STAFF: StaffSpec[] = [
  { name: "Arshad", payType: 3, dailyWage: 0, commissionRate: 10 },
  { name: "Bilal", payType: 3, dailyWage: 700, commissionRate: 0 },
  { name: "Karim", payType: 3, dailyWage: 500, commissionRate: 0 },
];

const DEFAULT_SERVICES: ServiceSpec[] = [
  { name: "Haircut", price: 500 },
  { name: "Shave", price: 250 },
  { name: "Facial", price: 1250 },
];

const DEFAULT_PARTNERS = [
  { name: "Partner A", sharePct: 60 },
  { name: "Partner B", sharePct: 40 },
];

/**
 * Refuse to run anywhere but a database this suite made. `setup.ts` points
 * `DATABASE_URL` at one; this proves it before the first write.
 */
export async function assertTestDatabase() {
  const { rows } = await db.execute<{ name: string }>(sql`select current_database() as name`);
  if (!rows[0]?.name.startsWith(DATABASE_PREFIX)) {
    throw new Error(`Refusing to write to "${rows[0]?.name}": not a database made by the integration suite`);
  }
}

export async function seedSalon(spec: SalonSpec = {}): Promise<Salon> {
  await assertTestDatabase();

  const developer = await seedDeveloper();
  const owner = await makeAccount(developer, "owner", "Owner Sahib");
  const manager = await makeAccount(developer, "manager", "Manager");
  await resetPin(developer, owner.id, OWNER_PIN);

  const staffIds: Record<string, string> = {};
  for (const member of spec.staff ?? DEFAULT_STAFF) {
    staffIds[member.name] = await addStaff(owner, member);
  }

  const serviceIds: Record<string, string> = {};
  for (const service of spec.services ?? DEFAULT_SERVICES) {
    await saveService(owner, {
      name: service.name,
      category: "Hair",
      price: service.price,
      maxPrice: service.maxPrice ?? null,
      minutes: 30,
      active: true,
    });
    const [row] = await db.select({ id: services.id }).from(services).where(eq(services.name, service.name));
    serviceIds[service.name] = row.id;
  }

  const partnerIds: Record<string, string> = {};
  const partnerSpec = spec.partners ?? DEFAULT_PARTNERS;
  for (const partner of partnerSpec) {
    await addPartner(owner, partner.name);
    const [row] = await db.select({ id: partners.id }).from(partners).where(eq(partners.name, partner.name));
    partnerIds[partner.name] = row.id;
  }
  await saveShares(
    owner,
    partnerSpec.map((partner) => ({ id: partnerIds[partner.name], name: partner.name, sharePct: partner.sharePct })),
  );

  if (spec.firstDay) await openFirstDay(owner, spec.firstDay.date, spec.firstDay.openingCash);

  return { developer, owner, manager, staff: staffIds, services: serviceIds, partners: partnerIds };
}

/** What `scripts/seed-developer.ts` does — the one account a fresh database needs. */
async function seedDeveloper(): Promise<Account> {
  const password = `dev-${randomBytes(9).toString("base64url")}`;
  const ctx = await auth.$context;
  const created = await ctx.internalAdapter.createUser(
    { name: "Developer", email: "developer@art-man.local", emailVerified: true, username: "developer", displayUsername: "developer", role: "developer" },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: await ctx.password.hash(password),
  });
  return { id: created.id, name: "Developer", username: "developer", role: "developer", password };
}

/** An account made on the Users screen. */
export async function makeAccount(by: SessionUser, role: "owner" | "manager", name: string, username: string = role): Promise<Account> {
  const password = `pw-${randomBytes(9).toString("base64url")}`;
  await createUser(by, { username, name, role, password });
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.username, username));
  return { id: row.id, name, username, role, password };
}

export async function addStaff(owner: SessionUser, member: StaffSpec): Promise<string> {
  await saveStaff(owner, {
    name: member.name,
    payType: member.payType,
    salary: member.salary ?? 0,
    dailyWage: member.dailyWage ?? 0,
    commissionRate: member.commissionRate ?? 0,
    active: true,
  });
  const [row] = await db.select({ id: staff.id }).from(staff).where(eq(staff.name, member.name));
  return row.id;
}

/**
 * Sign in the way the login screen does, and make the next Server Action or
 * Route Handler call come from that browser. Returns the session cookie.
 */
export async function signIn(account: Account): Promise<string> {
  const response = await auth.api.signInUsername({
    body: { username: account.username, password: account.password },
    asResponse: true,
  });
  if (!response.ok) throw new Error(`Sign-in as ${account.username} failed: ${response.status}`);
  const cookie = response.headers
    .getSetCookie()
    .map((line) => line.split(";")[0])
    .join("; ");
  if (!cookie) throw new Error(`Sign-in as ${account.username} set no cookie`);
  asRequest(cookie);
  return cookie;
}

/** A bill as the billing screen sends it, parsed by the schema the action uses. */
export async function ringUp(
  by: SessionUser,
  lines: { serviceId: string; staffId: string; amount?: number }[],
  payment: { cash?: number; online?: number } = {},
) {
  const input = createBillSchema.parse({
    lines: lines.map((line) => ({ ...line, dealId: null, dealInstanceId: null, amount: line.amount ?? null })),
    customer: null,
    cash: payment.cash ?? 0,
    online: payment.online ?? 0,
    clientId: null,
  });
  return createBill(by, input);
}

/**
 * Close the open day as the Day close screen does: attendance and payouts as
 * given, and the drawer counted at exactly what the books expect.
 */
export async function closeToday(
  by: SessionUser,
  choices: { attendance?: Record<string, boolean>; payouts?: Record<string, number> } = {},
) {
  const attendance = choices.attendance ?? {};
  const payouts = choices.payouts ?? {};
  const { expected } = await reviewClose({ attendance, payouts, counted: 0 });
  return closeDay(by, { attendance, payouts, counted: expected, clientId: null });
}

/** Close the open day and start the next one. */
export async function closeAndStartNext(by: SessionUser, choices?: Parameters<typeof closeToday>[1]) {
  const closed = await closeToday(by, choices);
  await startNextDay(by);
  return closed;
}

/**
 * Open all five of the pool's connections before a race (HANDOFF trap 8.28):
 * with one open, the first call finishes before the second has connected, and
 * a race that never happened proves nothing.
 */
export async function warmPool() {
  await Promise.all(Array.from({ length: 5 }, () => db.execute(sql`select pg_sleep(0.05)`)));
}

export async function openDay(): Promise<string> {
  const [row] = await db
    .select({ businessDate: businessDays.businessDate })
    .from(businessDays)
    .where(sql`${businessDays.closedAt} is null`);
  return row.businessDate;
}
