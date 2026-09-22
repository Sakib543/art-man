import { describe, expect, it } from "vitest";
import { atLeastOwner, canAccess, isRole, ROLES } from "./roles";

describe("isRole", () => {
  it("accepts the three roles that can log in", () => {
    for (const role of ROLES) expect(isRole(role)).toBe(true);
  });

  it("rejects anything else", () => {
    for (const value of ["staff", "admin", "", null, undefined, 1]) expect(isRole(value)).toBe(false);
  });
});

describe("canAccess", () => {
  it("lets a role into what it is listed for", () => {
    expect(canAccess("manager", ["owner", "manager"])).toBe(true);
    expect(canAccess("owner", ["owner"])).toBe(true);
  });

  it("keeps a manager out of the owner's screens", () => {
    expect(canAccess("manager", ["owner"])).toBe(false);
  });

  it("lets the developer into everything", () => {
    expect(canAccess("developer", ["owner"])).toBe(true);
    expect(canAccess("developer", ["manager"])).toBe(true);
    expect(canAccess("developer", [])).toBe(true);
  });

  it("keeps everyone else out of the developer's own screens", () => {
    expect(canAccess("owner", ["developer"])).toBe(false);
    expect(canAccess("manager", ["developer"])).toBe(false);
  });
});

describe("atLeastOwner", () => {
  it("is true for the owner and the developer only", () => {
    expect(atLeastOwner("owner")).toBe(true);
    expect(atLeastOwner("developer")).toBe(true);
    expect(atLeastOwner("manager")).toBe(false);
  });
});
