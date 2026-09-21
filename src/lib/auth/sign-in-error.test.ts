import { describe, expect, it } from "vitest";
import { signInErrorMessage, WRONG_CREDENTIALS } from "./sign-in-error";

describe("signInErrorMessage", () => {
  it("is vague about a wrong password, so it does not reveal which accounts exist", () => {
    expect(signInErrorMessage({ status: 401 })).toBe(WRONG_CREDENTIALS);
    expect(signInErrorMessage({ status: 403 })).toBe(WRONG_CREDENTIALS);
  });

  it("trusts Better Auth's code even when the status is not 401", () => {
    expect(signInErrorMessage({ status: 400, code: "INVALID_USERNAME_OR_PASSWORD" })).toBe(WRONG_CREDENTIALS);
    expect(signInErrorMessage({ status: 500, code: "USER_NOT_FOUND" })).toBe(WRONG_CREDENTIALS);
  });

  it("does NOT blame the password when the server is broken", () => {
    // The whole point of this module: a database that is down used to read as a typo.
    const message = signInErrorMessage({ status: 500 });
    expect(message).not.toBe(WRONG_CREDENTIALS);
    expect(message).toContain("not your password");
    expect(message).toContain("500");
  });

  it("says the server could not be reached when there was no reply", () => {
    expect(signInErrorMessage({ status: 0 })).toContain("Cannot reach the server");
    expect(signInErrorMessage({})).toContain("Cannot reach the server");
    expect(signInErrorMessage(null)).toContain("Cannot reach the server");
    expect(signInErrorMessage(undefined)).toContain("Cannot reach the server");
  });

  it("explains a rate limit instead of calling it a wrong password", () => {
    expect(signInErrorMessage({ status: 429 })).toContain("Too many");
  });

  it("names the status on any other server fault", () => {
    expect(signInErrorMessage({ status: 502 })).toContain("502");
    expect(signInErrorMessage({ status: 503 })).toContain("503");
  });
});
