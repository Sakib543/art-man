import { describe, expect, it } from "vitest";
import { checkCreate, checkResetPassword, checkSetActive, creatableRoles, visibleRoles } from "./rules";
import type { UserSummary, Viewer } from "./rules";

const owner: Viewer = { id: "u-owner", role: "owner" };
const developer: Viewer = { id: "u-dev", role: "developer" };

const account = (over: Partial<UserSummary> = {}): UserSummary => ({
  id: "u-manager",
  role: "manager",
  active: true,
  ...over,
});

describe("visibleRoles", () => {
  it("hides the developer from the Owner", () => {
    // The client asked that the Owner see no sign the role exists.
    expect(visibleRoles("owner")).toEqual(["owner", "manager"]);
  });

  it("shows the developer everything", () => {
    expect(visibleRoles("developer")).toEqual(["developer", "owner", "manager"]);
  });
});

describe("creatableRoles", () => {
  it("lets the Owner create another Owner", () => {
    expect(creatableRoles("owner")).toEqual(["owner", "manager"]);
  });

  it("never offers the Owner a developer account", () => {
    expect(creatableRoles("owner")).not.toContain("developer");
  });

  it("gives the Manager nothing", () => {
    expect(creatableRoles("manager")).toEqual([]);
  });
});

describe("checkCreate", () => {
  it("allows an Owner to create a Manager", () => {
    expect(checkCreate(owner, "manager")).toBeNull();
  });

  it("refuses an Owner creating a developer", () => {
    expect(checkCreate(owner, "developer")).toBe("You cannot create that kind of account.");
  });
});

describe("checkResetPassword", () => {
  it("allows the Owner to reset a Manager", () => {
    expect(checkResetPassword(owner, account())).toBeNull();
  });

  it("sends you to Settings for your own password", () => {
    // Doing it here would sign the person out mid-click.
    expect(checkResetPassword(owner, account({ id: owner.id, role: "owner" }))).toBe(
      "Change your own password in Settings, not here.",
    );
  });

  it("sends the developer to the Passwords screen for their own", () => {
    // Settings is no use to a developer who has forgotten their password, and
    // nobody stands above them to reset it. The Passwords screen lets that one
    // account set its own, keeping the session it is done from.
    expect(checkResetPassword(developer, account({ id: developer.id, role: "developer" }))).toBe(
      "Change your own password on the Passwords screen, not here.",
    );
  });

  it("refuses an Owner reaching a developer account", () => {
    expect(checkResetPassword(owner, account({ id: "u-dev", role: "developer" }))).toBe(
      "That account is not yours to manage.",
    );
  });

  it("lets the developer reset an Owner", () => {
    expect(checkResetPassword(developer, account({ id: "u-owner", role: "owner" }))).toBeNull();
  });
});

describe("checkSetActive", () => {
  it("closes a Manager account", () => {
    expect(checkSetActive(owner, account(), false, 1)).toBeNull();
  });

  it("refuses closing your own account", () => {
    expect(checkSetActive(owner, account({ id: owner.id, role: "owner" }), false, 2)).toBe(
      "You cannot close your own account.",
    );
  });

  it("refuses closing the last open Owner", () => {
    // Nobody left who could open it again: the salon does not know the
    // developer account exists.
    expect(checkSetActive(developer, account({ id: "u-owner", role: "owner" }), false, 1)).toBe(
      "This is the last open Owner account. Make another Owner first.",
    );
  });

  it("closes an Owner while another one is open", () => {
    expect(checkSetActive(developer, account({ id: "u-owner", role: "owner" }), false, 2)).toBeNull();
  });

  it("re-opens a closed Owner even though none is open", () => {
    // The last-Owner rule guards closing, never opening.
    expect(checkSetActive(developer, account({ id: "u-owner", role: "owner", active: false }), true, 0)).toBeNull();
  });

  it("says so when nothing would change", () => {
    expect(checkSetActive(owner, account(), true, 2)).toBe("That account is already open.");
    expect(checkSetActive(owner, account({ active: false }), false, 2)).toBe("That account is already closed.");
  });

  it("refuses an Owner reaching a developer account", () => {
    expect(checkSetActive(owner, account({ id: "u-dev", role: "developer" }), false, 2)).toBe(
      "That account is not yours to manage.",
    );
  });
});
