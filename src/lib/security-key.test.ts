import { afterEach, describe, expect, it, vi } from "vitest";
import { newSecurityKey, parseSecurityKey, securityKey, securityKeyStatus } from "./security-key";

const secret = Buffer.alloc(32, 7);
const value = `2026-10-05.${secret.toString("base64url")}`;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("parseSecurityKey", () => {
  it("reads the first business day and the key", () => {
    expect(parseSecurityKey(value)).toEqual({ since: "2026-10-05", key: secret });
  });

  it("ignores the spaces a copy and paste leaves around it", () => {
    expect(parseSecurityKey(`  ${value}\n`)).toEqual({ since: "2026-10-05", key: secret });
  });

  it("has no key when the variable is missing or empty", () => {
    expect(parseSecurityKey(undefined)).toBeNull();
    expect(parseSecurityKey("")).toBeNull();
    expect(parseSecurityKey("   ")).toBeNull();
  });

  it("refuses any other form rather than sealing days without a key", () => {
    for (const wrong of [
      secret.toString("base64url"), // no date
      `2026-10-05:${secret.toString("base64url")}`, // the wrong separator
      `2026-02-30.${secret.toString("base64url")}`, // no such day
      `2026-10-05.${Buffer.alloc(16, 7).toString("base64url")}`, // 16 bytes: too short
      `2026-10-05.${secret.toString("base64")}+/`, // not base64url
    ]) {
      expect(() => parseSecurityKey(wrong), wrong).toThrow("SECURITY_CODE_KEY is not in the form YYYY-MM-DD.<secret>");
    }
  });
});

describe("securityKey and securityKeyStatus", () => {
  it("read SECURITY_CODE_KEY each time", () => {
    vi.stubEnv("SECURITY_CODE_KEY", "");
    expect(securityKey()).toBeNull();
    expect(securityKeyStatus()).toEqual({ state: "not-set" });

    vi.stubEnv("SECURITY_CODE_KEY", value);
    expect(securityKey()).toEqual({ since: "2026-10-05", key: secret });
    expect(securityKeyStatus()).toEqual({ state: "set", since: "2026-10-05" });
  });

  it("say a key set wrongly is wrong, without the status throwing", () => {
    vi.stubEnv("SECURITY_CODE_KEY", "2026-10-05.short");
    expect(() => securityKey()).toThrow("SECURITY_CODE_KEY");
    expect(securityKeyStatus()).toEqual({ state: "invalid" });
  });
});

describe("newSecurityKey", () => {
  it("makes a value parseSecurityKey reads back", () => {
    expect(newSecurityKey("2026-10-05", secret)).toBe(value);
    expect(parseSecurityKey(newSecurityKey("2026-10-05", secret))).toEqual({ since: "2026-10-05", key: secret });
  });

  it("makes 32 random bytes of its own each time", () => {
    const one = parseSecurityKey(newSecurityKey("2026-10-05"));
    const two = parseSecurityKey(newSecurityKey("2026-10-05"));
    expect(one?.key).toHaveLength(32);
    expect(one?.key.equals(two!.key)).toBe(false);
  });

  it("refuses a day that does not exist", () => {
    expect(() => newSecurityKey("2026-13-01")).toThrow("Not a date");
  });
});
