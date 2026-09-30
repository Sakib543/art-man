import { describe, expect, it } from "vitest";
import { cleanName, loginAuditEntry, throttledAuditEntry } from "./login-audit";

describe("loginAuditEntry", () => {
  it("records a failed sign-in with its reason", () => {
    expect(
      loginAuditEntry({ path: "/sign-in/username", username: "owner", failureCode: "INVALID_USERNAME_OR_PASSWORD" }),
    ).toEqual({
      actor: "owner",
      action: "login.failed",
      target: "owner",
      success: false,
      after: { reason: "INVALID_USERNAME_OR_PASSWORD" },
    });
  });

  it("tells a closed account apart from a wrong password", () => {
    const closed = loginAuditEntry({ path: "/sign-in/username", username: "manager", failureCode: "ACCOUNT_CLOSED" });
    expect(closed?.after).toEqual({ reason: "ACCOUNT_CLOSED" });
  });

  it("records a successful sign-in too", () => {
    expect(loginAuditEntry({ path: "/sign-in/username", username: "manager", failureCode: null })).toEqual({
      actor: "manager",
      action: "login.ok",
      target: "manager",
      success: true,
    });
  });

  it("ignores every other route", () => {
    expect(loginAuditEntry({ path: "/sign-out", username: "owner", failureCode: null })).toBeNull();
    expect(loginAuditEntry({ path: "/get-session", username: null, failureCode: null })).toBeNull();
  });

  it("still records an attempt that named nobody", () => {
    const entry = loginAuditEntry({ path: "/sign-in/username", username: undefined, failureCode: "BAD_REQUEST" });
    expect(entry?.actor).toBe("unknown");
    expect(entry?.action).toBe("login.failed");
  });

  it("does not let a long or blank username into the log as it is", () => {
    expect(loginAuditEntry({ path: "/sign-in/username", username: "   ", failureCode: null })?.actor).toBe("unknown");
    expect(loginAuditEntry({ path: "/sign-in/username", username: "a".repeat(200), failureCode: null })?.actor).toHaveLength(64);
  });

  it("does not trust a non-string from the request body", () => {
    expect(loginAuditEntry({ path: "/sign-in/username", username: { toString: () => "x" }, failureCode: null })?.actor).toBe(
      "unknown",
    );
  });
});

describe("the address and the lock (P7.12)", () => {
  it("records where a sign-in came from, when the platform says", () => {
    expect(loginAuditEntry({ path: "/sign-in/username", username: "owner", failureCode: null, ip: "203.0.113.7" })).toMatchObject({
      action: "login.ok",
      after: { ip: "203.0.113.7" },
    });
    expect(
      loginAuditEntry({ path: "/sign-in/username", username: "owner", failureCode: "INVALID_USERNAME_OR_PASSWORD", ip: "203.0.113.7" }),
    ).toMatchObject({ after: { reason: "INVALID_USERNAME_OR_PASSWORD", ip: "203.0.113.7" } });
  });

  it("writes a refused sign-in as throttled, not as a failure — it never reached the password check", () => {
    expect(throttledAuditEntry("  Owner ", "TOO_MANY_ATTEMPTS", 12, "203.0.113.7")).toEqual({
      actor: "Owner",
      action: "login.throttled",
      target: "Owner",
      success: false,
      after: { reason: "TOO_MANY_ATTEMPTS", minutesLeft: 12, ip: "203.0.113.7" },
    });
    expect(throttledAuditEntry(undefined, "TOO_MANY_ATTEMPTS", 3).after).toEqual({ reason: "TOO_MANY_ATTEMPTS", minutesLeft: 3 });
  });

  it("names a username the way the lock counts it", () => {
    expect(cleanName("  Manager ")).toBe("Manager");
    expect(cleanName(42)).toBe("unknown");
  });
});
