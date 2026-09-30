import { describe, expect, it } from "vitest";
import { restoreWizard, wizardKey, type WizardState } from "./wizard-state";

const kept: WizardState = {
  v: 1,
  clientId: "8d2f6a4e-0000-4000-8000-000000000001",
  step: 3,
  present: { bilal: false, arshad: true },
  payouts: { bilal: "0", arshad: "500" },
  counted: "",
  reason: "",
};

describe("restoreWizard", () => {
  it("gives back what was kept for today's staff", () => {
    expect(restoreWizard(JSON.stringify(kept), ["bilal", "arshad"])).toEqual(kept);
  });

  it("goes back to the count from the last step: expected cash is worked out again, never kept", () => {
    expect(restoreWizard(JSON.stringify({ ...kept, step: 5, counted: "12000" }), ["bilal", "arshad"])).toMatchObject({ step: 4, counted: "12000" });
  });

  it("drops anyone no longer on the staff list", () => {
    const restored = restoreWizard(JSON.stringify(kept), ["arshad", "newbie"]);
    expect(restored?.present).toEqual({ arshad: true });
    expect(restored?.payouts).toEqual({ arshad: "500" });
  });

  it("keeps step 3's payments unopened when they were", () => {
    expect(restoreWizard(JSON.stringify({ ...kept, step: 2, payouts: null }), ["bilal"])?.payouts).toBeNull();
  });

  it.each([
    ["nothing kept", null],
    ["not JSON", "{oops"],
    ["another version", JSON.stringify({ ...kept, v: 2 })],
    ["a wrong shape", JSON.stringify({ ...kept, present: { bilal: "yes" } })],
    ["no id", JSON.stringify({ ...kept, clientId: undefined })],
  ])("starts over on %s", (_what, raw) => {
    expect(restoreWizard(raw, ["bilal", "arshad"])).toBeNull();
  });
});

describe("wizardKey", () => {
  it("is one key per business day", () => {
    expect(wizardKey("2026-09-30")).toBe("art-man:day-close:2026-09-30");
  });
});
