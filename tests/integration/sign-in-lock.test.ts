import { and, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { resetPassword } from "@/features/developer/service";
import { auth } from "@/lib/auth/server";
import { seedSalon, type Salon } from "./salon";

/**
 * P7.12 (QA-34): a username takes 5 wrong passwords in 15 minutes, then is
 * refused — whatever address the attempts claim to come from — and every
 * refusal is in the audit log. Sign-ins go through Better Auth's HTTP handler,
 * as the login form's do, with its hooks; its own per-address limiter is on in
 * production only, so what is measured here is the account lock alone.
 */
let salon: Salon;

beforeAll(async () => {
  salon = await seedSalon();
});

/** A sign-in as the login form sends it, claiming to come from `ip`. */
async function signIn(username: string, password: string, ip = "203.0.113.7") {
  const response = await auth.handler(
    new Request("http://localhost:3000/api/auth/sign-in/username", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000", "x-forwarded-for": ip },
      body: JSON.stringify({ username, password }),
    }),
  );
  const body = await response.json().catch(() => null);
  return { status: response.status, code: body?.code as string | undefined, message: body?.message as string | undefined };
}

const rows = (action: string, target: string) =>
  db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.action, action), sql`lower(${auditLog.target}) = ${target.toLowerCase()}`));

describe("the account lock", () => {
  it("lets five wrong passwords through as wrong passwords, each from a different address", async () => {
    for (let i = 1; i <= 5; i++) {
      expect(await signIn("manager", "not-the-password", `198.51.100.${i}`)).toMatchObject({
        status: 401,
        code: "INVALID_USERNAME_OR_PASSWORD",
      });
    }
    const failed = await rows("login.failed", "manager");
    expect(failed).toHaveLength(5);
    // The address each claimed, as the platform's header gave it.
    expect(failed.map((row) => (row.after as { ip?: string }).ip).sort()).toEqual(
      [1, 2, 3, 4, 5].map((i) => `198.51.100.${i}`).sort(),
    );
  });

  it("then refuses the sixth — the right password too, and a new address changes nothing (QA-34)", async () => {
    const refused = await signIn("manager", salon.manager.password, "192.0.2.99");

    expect(refused.status).toBe(429);
    expect(refused.code).toBe("TOO_MANY_ATTEMPTS");
    expect(refused.message).toMatch(/^Too many wrong passwords for this username\. Try again in 1[45] minutes/);
  });

  it("writes the refusal down as throttled, and not as another failure", async () => {
    const throttled = await rows("login.throttled", "manager");
    expect(throttled).toHaveLength(1);
    expect(throttled[0]).toMatchObject({ success: false, after: { reason: "TOO_MANY_ATTEMPTS", ip: "192.0.2.99" } });
    expect(await rows("login.failed", "manager")).toHaveLength(5);
  });

  it("is the username's whatever its case, and leaves every other account alone", async () => {
    expect((await signIn("MANAGER", "anything")).code).toBe("TOO_MANY_ATTEMPTS");
    expect(await signIn("owner", salon.owner.password)).toMatchObject({ status: 200 });
  });

  it("locks a username that does not exist the same way, so the lock gives nothing away", async () => {
    for (let i = 0; i < 5; i++) await signIn("nobody-here", "guess");
    const refused = await signIn("nobody-here", "guess");
    expect(refused.code).toBe("TOO_MANY_ATTEMPTS");
    expect(refused.message).toMatch(/^Too many wrong passwords for this username/);
  });

  it("is ended by a password reset: the right person is not made to wait", async () => {
    await resetPassword(salon.developer, salon.manager.id, "a-new-password-1");
    expect(await signIn("manager", "a-new-password-1")).toMatchObject({ status: 200 });
  });

  it("counts again from a successful sign-in", async () => {
    for (let i = 0; i < 4; i++) await signIn("owner", "wrong-again");
    expect(await signIn("owner", salon.owner.password)).toMatchObject({ status: 200 });
    for (let i = 0; i < 4; i++) await signIn("owner", "wrong-again");
    // Eight wrong in all, but never five since the last good one.
    expect(await signIn("owner", salon.owner.password)).toMatchObject({ status: 200 });
  });
});
