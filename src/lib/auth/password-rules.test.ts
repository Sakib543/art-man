import { describe, expect, it } from "vitest";
import { checkNewPassword } from "./password-rules";

describe("checkNewPassword", () => {
  it("accepts a reasonable password", () => {
    expect(checkNewPassword("Salon2026x")).toBeNull();
  });

  it("rejects a short one", () => {
    expect(checkNewPassword("abc12")).toContain("at least 8");
  });

  it("rejects one made only of digits", () => {
    expect(checkNewPassword("12345678")).toContain("letters");
  });

  it("rejects the same password again", () => {
    expect(checkNewPassword("Salon2026x", "Salon2026x")).toContain("different");
  });

  it("does not compare with a current password when none is given", () => {
    expect(checkNewPassword("Salon2026x", undefined)).toBeNull();
  });

  it("rejects an absurdly long one", () => {
    expect(checkNewPassword("a1".repeat(80))).toContain("too long");
  });
});
