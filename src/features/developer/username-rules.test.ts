import { describe, expect, it } from "vitest";
import { checkUsername, MAX_USERNAME_LENGTH, usernameKey } from "./username-rules";

describe("checkUsername", () => {
  it("accepts an ordinary one", () => {
    expect(checkUsername("developer")).toBeNull();
    expect(checkUsername("saud.admin")).toBeNull();
    expect(checkUsername("dev_2")).toBeNull();
    expect(checkUsername("art-man")).toBeNull();
  });

  it("refuses one that is too short or too long", () => {
    expect(checkUsername("ab")).toMatch(/at least 3/);
    expect(checkUsername("a".repeat(MAX_USERNAME_LENGTH + 1))).toMatch(/32 characters or fewer/);
    expect(checkUsername("a".repeat(MAX_USERNAME_LENGTH))).toBeNull();
  });

  it("refuses a space, an accent or a symbol", () => {
    // All three are typed at a login screen by someone who may be tired, and
    // all three are easy to get subtly wrong the second time.
    for (const bad of ["saud admin", "saudé", "saud@salon", "saud/admin", "saud\ttab"]) {
      expect(checkUsername(bad), bad).toMatch(/letters, numbers/i);
    }
  });

  it("refuses one made only of punctuation", () => {
    expect(checkUsername("...")).toMatch(/at least one letter or number/);
    expect(checkUsername("-_-")).toMatch(/at least one letter or number/);
  });

  it("trims before judging, so a pasted value with spaces still passes", () => {
    expect(checkUsername("  developer  ")).toBeNull();
    expect(checkUsername("  ab  ")).toMatch(/at least 3/);
  });

  it("refuses the one you already have, whatever the case", () => {
    expect(checkUsername("developer", "developer")).toMatch(/already your username/);
    expect(checkUsername("Developer", "developer")).toMatch(/already your username/);
    expect(checkUsername("  DEVELOPER ", "developer")).toMatch(/already your username/);
    // A different name is fine even if it only differs by more than case.
    expect(checkUsername("developer2", "developer")).toBeNull();
  });
});

describe("usernameKey", () => {
  it("lowercases and trims, so two spellings are one account", () => {
    expect(usernameKey("  Saud.Admin ")).toBe("saud.admin");
    expect(usernameKey("OWNER")).toBe(usernameKey("owner"));
  });
});
