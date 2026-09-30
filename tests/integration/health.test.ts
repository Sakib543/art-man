import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { db } from "@/db";
import { assertTestDatabase } from "./salon";

/**
 * P7.11 (QA-30): the route the error screen asks, once a screen has failed,
 * whether the server reaches its database — so the screen can tell a
 * database outage from a fault in the screen instead of blaming the database
 * every time.
 */
afterEach(() => {
  vi.restoreAllMocks();
});

describe("/api/health", () => {
  it("answers 204 when the database answers, and is never cached", async () => {
    await assertTestDatabase();
    const response = await health();
    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 503 when the database does not", async () => {
    vi.spyOn(db, "execute").mockRejectedValueOnce(new Error("connect ECONNREFUSED 127.0.0.1:5432"));
    const response = await health();
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
  });
});
